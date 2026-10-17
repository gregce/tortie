#!/usr/bin/env node
/**
 * probe:p346 — THE PHASE 346 APP RUN, the Mac side: a session started from
 * the phone, through the door's one new write, `POST /v1/start`, and the
 * offer it reads on `GET /v1/sessions` (build/p346/SPEC.md §6.1).
 *
 * ONE Electron at HEAD through build/electron-run.mjs's `withElectron`, on a
 * scratch profile and a scratch HOME under the harness directory, the tmux
 * socket build/harness-socket.mjs hands it (`gmux-p346…`), and the LOOPBACK
 * scratch machine build/with-scratch-machine.mjs starts around this file, with
 * the quiet shell, its own far HOME and none of the person's keys
 * (`SCRATCH_MACHINE_QUIET_SHELL=1`, `SCRATCH_MACHINE_SCRATCH_HOME=1`,
 * `SCRATCH_MACHINE_NO_OWN_KEYS=1`, which the npm script exports and this file
 * refuses to run without: with no far HOME of the yard's own, the machine's
 * agent scan would read his real home and a start there would run his real
 * Claude Code). With `P346_PARENT_CHECKOUT` (a BUILT `0b87d0af`) the parent's
 * Electron runs FIRST on the same profile, one after the other and never at
 * once, so HEAD starts on a store whose agreement covers the eleven routes and
 * `start` WAITS for its Allow (333.12, SPEC D2).
 *
 * WHAT IS REAL. The door, switched on, confirmed and published through the
 * STAND-IN Tailscale (build/p330/tailscale-standin.mjs behind
 * GMUX_TAILSCALE_BIN, preflighted by sha256, the process table sampled every
 * second: a real Tailscale under the app, or run as a command, FAILS the run).
 * The name check asks build/p332/dns-standin.mjs IN THIS PROCESS on 127.0.0.1.
 * The phones are build/p316/node-phone.mjs, paired through the stand-in's
 * loopback forwarder with mutual TLS, their starts signed over the method, the
 * path and the body (`startSession`), their answers read by `startAnswerOf`.
 *
 * THE AGENTS ARE STAND-INS, and the scratch login shell resolves every bare
 * name the app may launch to one: `claude` and `codex` to
 * build/p318/stand-in.mjs (its own runner, behind a script that first writes
 * down the argv, cwd and environment NAMES it was handed), and `cursor-agent`,
 * `codewhale`, `muse`, `pi`, `omp` and `opencode` to build/p346/argv-stand-in.mjs,
 * which answers its row's own version probe (read from the registry through
 * the pinned tsx before the launch), writes down the same record and draws one
 * prompt. The scratch login PATH is the scratch bin and the system folders and
 * nothing else, and so is THE APP'S OWN PATH (the scratch bin, one `node` link
 * for the Electron shim, the system folders), with none of the variables a
 * row's own folders name (`$NVM_BIN`): Tortie merges the app's own PATH into
 * every create's search, and before Phase 346's fix round the app inherited
 * whoever ran the probe's, which reached his own install folders. The probe
 * REFUSES (exit 2) unless every one of the eight resolves there, none of the
 * hidden five (gemini, qwen, agy, grok, droid) resolves at all, the checkout's
 * own overlay reader finds their renamed binaries nowhere (build/hidden-agents.mjs,
 * before EVERY launch, and `agents:list` read back), AND THE INSTALLS FENCE
 * holds: every candidate name of every launchable row (CodeWhale's `codew` and
 * `deepseek` too), along the walk the app's create makes, read through the
 * checkout's own merge and resolver, is inside the run, or is the launched
 * name's copy in a system install folder BEHIND its stand-in. Every start asks
 * the same walk again before it is sent and is never sent when the create
 * would run anything else; a start on the machine names Claude Code or Codex
 * only. On the loopback machine the far HOME's `.local/bin` holds the same
 * `claude` and `codex`. NO VENDOR PROCESS IS STARTED BY THE PROBE AND NO MODEL
 * TURN IS SPENT. One stated exception, the app's own: Tortie's detection scan,
 * and the loopback machine's agent scan (that machine is this Mac), ask every
 * SHADOWED copy of a name they resolve in the compiled install folders
 * (`/opt/homebrew/bin`, `/usr/local/bin`) for its version, so a real `omp`
 * there is run with `--version` by the app itself, as in every GMUX_PROBES
 * launch on this Mac; the fence prints every such shadow and refuses any other
 * real copy, a copy under any home above all. RUN fails on any manifest row
 * whose program is not this run's.
 *
 * THE ARMS (SPEC §6.1; S0 split in two and S1 in two, each half its own verdict)
 *   S0P with the parent: its `/v1/start` answers 404 before its body (the
 *       request's head sent, its body withheld) and to a whole request,
 *       nothing reaches its main, and its `/v1/sessions` has no `start`
 *   S0  at HEAD, after the parent: the door reads `confirmed`, `start` alone
 *       waits; `/v1/sessions` says `{ state: 'waiting' }`; `/v1/start` answers
 *       404 before its body and nothing reaches main; the face shows
 *       `New: start sessions from your phone` and its sentence above Allow,
 *       and the block's honesty sentence says what a start lets a phone do;
 *       Allow, pressed in Settings then Phone, covers `start`; the next read
 *       carries the offer and the door now waits for a start's body (the
 *       control)
 *   S1  THE OFFER against this file's own reading of main: projects in order
 *       with labels, machine labels and folders; places with `ready`, `read`
 *       and exactly the agents installed there (this Mac: the eight stand-ins
 *       and no hidden agent); the agent rows in registry order; `chosen` per
 *       D10 before and after the matrix; `defaultAgent` the Mac's own
 *   S1D THE LAUNCH DEFAULTS: an unsealed safeguard-off default written into
 *       settings.json before the launch is dropped and no line is said; one
 *       sealed through the Settings window's own bridge is said by its label
 *       and reaches the next Claude Code start's argv (UNREADABLE, never a
 *       pass, when the bridge cannot be driven)
 *   S2  THE MATRIX, this Mac: one start per installed agent (eight) in one
 *       project: 200 `done`, the name `<agent>-<n>` by the shared rule, main
 *       lists it with that agent, the manifest row's argv is what the started
 *       process itself saw (by the stand-in's own path), its cwd the project's
 *       folder, `/v1/screen` answers its terminal, the Mac's active project and
 *       session never move
 *   S3  THE MATRIX, the machine: Claude Code and Codex in a project on the
 *       loopback machine: `done`, main's row remote, the far server holding it,
 *       the far process started as main recorded it; with the machine's sshd
 *       paused (its recorded pids, resumed in a `finally`) the offer says not
 *       ready (main's readiness asks the session feed since the fix round) and
 *       a start is refused `machine`, starting nothing
 *   S4  THE REFUSALS: a project closed after the offer (`project`), a hidden
 *       agent's id (`agent`), `shell` and an id only agents.json could hold
 *       (`malformed`), an agent whose program was removed after the offer
 *       (`agent`, from the create's own code); none starts anything
 *   S5  TIMING (D16, D17): the first start after launch (cold), 20 warm, 5
 *       with a sealed shell variable name (the login shell asked), 5 on the
 *       machine; p50/p95/max printed; every answer inside the door's 15 s,
 *       warm local p95 under 3 s, remote p95 under 10 s; a breach is printed
 *       for the main session, never retried away
 *   S6  THE LEDGER AND THE LIMITS: the same bytes again (404, one session);
 *       the same write id fresh-signed while it runs (`busy`, START_STILL) and
 *       after (the recorded `done`, one session); a relay this file holds CUTS
 *       the answer once main logged the act, then the same id (the recorded
 *       `done`, one session); two phones at once (one `done`, one `busy`
 *       START_BUSY, one session); seven starts from one phone in a minute (six
 *       `done`, the seventh `refused` `often`, unrecorded, acting once the
 *       window allows)
 *   S7  THE LOGS, after the app is gone: one `the phone's start:` line per
 *       start that acted, none naming a project, a path, an agent, an
 *       argument, a write id or a sentence; no write id in any file under the
 *       profile, HOME or the harness directory
 *   S8  THE MAC'S SURFACES (with the parent): the native application menu as
 *       main built it, read over main's inspector, equal at both builds
 *   S9  NO STATUS FROM THE PHONE: no started session reads `needs_input`
 *   S10 THE ENDS: every session ANY answer said was made (not only the ones an
 *       arm expected) ended and removed by main's own verbs, none left on the
 *       far server; every stand-in by pid in the `finally`
 *   RUN the preflights, the quiet agents at every launch, the eight resolved
 *       and the five not, the installs fence, every manifest row's program the
 *       run's own, no real Tailscale, nothing forbidden at the stand-in,
 *       nothing of this run left, his shell history unmoved. Since the
 *       ruled round the manifest is read from a COPY beside its WAL
 *       (build/scratch-login.mjs), because `sqlite3 -readonly` cannot open
 *       the app's own file after a quit, and his history is stat'ed under the
 *       ACCOUNT's home (`os.userInfo().homedir`), never `$HOME`, which read
 *       "none" under the scratch HOME and tested nothing; an unread manifest
 *       or a missing history file reads RUN UNREADABLE, never FAIL or PASS
 *
 * WHAT IT REFUSES TO DO. It never names the person's tmux server or `-L gmux`
 * (it refuses any socket that is not a `gmux-p346` harness socket), binds no
 * real interface and dials nothing but 127.0.0.1, never runs a real
 * `tailscale`, never asks real DNS, reads no keychain and no credential (the
 * app runs `--use-mock-keychain`), and signals only the pids it started, the
 * stand-ins wrote in their records, or the scratch sshd's own, by pid, never
 * by pattern. Every local shell is the scratch HOME's (HISTFILE=/dev/null,
 * TERM_SESSION_ID unset). It takes NO screenshot. It reads his shell history's
 * size and modified time, and nothing else of it.
 *
 * VERIFIERS ONLY: it starts an Electron. Take the orchestrator's lock.
 *
 *   npm run build && npm run -s probe:p346
 *   P346_PARENT_CHECKOUT=<a BUILT 0b87d0af checkout> npm run -s probe:p346
 *   P346_ARMS=S1,S2,…              the arms to run (default all; S0/S0P/S1/RUN always read)
 *   P346_KEEP=1                    keep the scratch world and every answer (the report) for a re-derivation
 *   node build/p346/probe-p346.mjs --grader-self-test   every grader on its fixtures; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ.
 */

import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { accessSync, chmodSync, constants as fsConstants, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { createServer as createNetServer, connect as netConnect } from 'node:net';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { gradeFixtures } from '../probe-graders.mjs';
import { keyscanText } from '../ssh-run.mjs';
import { tsxCli } from '../ts-runner.mjs';
import { AGENTS_LIST_EXPR, HIDDEN_AGENT_IDS, hiddenAgentsOverlay, hiddenAgentsPrecheck, hiddenAgentsScanVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { freshWriteId, makePhone, pairThrough, rawExchange, readOffer, readSessions, screenRead, signedGet, signedHeadersFor, startAnswerOf, startSession, writeBodyOf } from '../p316/node-phone.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, processRows, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin } from '../p332/dns-standin.mjs';
import { hellos, writeWrappers } from '../p318/stand-in.mjs';
import { ARGV_STANDIN_BINS, readStartRecords, writeArgvWrappers, writeIdentities, writeLoggedWrappers } from './argv-stand-in.mjs';
import { manifestSessions, within } from '../scratch-login.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hr = () => process.hrtime.bigint();
const msBetween = (from, to) => Number(BigInt(to) - BigInt(from)) / 1e6;

// ---------------------------------------------------------------------------
// What the run holds the app against, BY VALUE or read from the checkout
// ---------------------------------------------------------------------------

/** The parent this phase is measured against (build/p346/SPEC.md, its head). */
export const SNAPSHOT = '0b87d0af';
export const MACHINE_ID = 'p346far';
/** The eight compiled launchable agents the scratch PATH answers, in registry order (SPEC M1). */
export const EIGHT = Object.freeze(['claude', 'cursor', 'codex', 'deepseek', 'muse', 'pi', 'omp', 'opencode']);
/** The bare names those eight launch by. */
export const BIN_OF = Object.freeze({ claude: 'claude', cursor: 'cursor-agent', codex: 'codex', deepseek: 'codewhale', muse: 'muse', pi: 'pi', omp: 'omp', opencode: 'opencode' });
/** The hidden five's bare names (build/hidden-agents.mjs renames their rows; this file asks the login shell too). */
export const HIDDEN_BINS = Object.freeze(['gemini', 'qwen', 'agy', 'grok', 'droid']);
/** The log phrase every start is written under (SPEC D32). */
export const START_LINE = "the phone's start:";
/** The rate the Mac holds a phone to (SPEC D16), read here as the pacer's own bound. */
export const RATE_MAX = 6;
export const RATE_WINDOW_MS = 60_000;
/** S5's counts and bounds (SPEC §6.1). */
export const WARM_STARTS = 20;
export const ENV_STARTS = 5;
export const REMOTE_STARTS = 5;
export const ANSWER_BOUND_MS = 15_000;
export const WARM_P95_MS = 3_000;
export const REMOTE_P95_MS = 10_000;
/** The shell variable name S5 seals for muse; the scratch login shell exports it. */
export const ENV_NAME = 'P346_PROBE_VAR';
/** The body of an id only an agents.json row could hold (SPEC D6): never a compiled id. */
export const OVERLAY_ONLY_ID = 'p346-overlay-agent';

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

/**
 * A string literal reached by a path of names inside an object literal: after
 * each anchor in turn (`POCKET_NEW_ROUTE_WORDS`, `start`, …), the literal of
 * the last key. Answers null when any anchor is not found.
 */
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

/** The words main says, read from the checkout's own source (never typed here twice). */
export function wordsOf(checkout) {
  const src = (rel) => {
    try {
      return readFileSync(join(checkout, rel), 'utf8');
    } catch {
      return '';
    }
  };
  const copy = src('src/shared/start-copy.ts');
  const pocket = src('src/shared/ipc/pocket.ts');
  const words = {};
  for (const name of ['START_PROJECT_GONE', 'START_FOLDER_GONE', 'START_AGENT_GONE', 'START_MACHINE_AWAY', 'START_INTERPRETER', 'START_OFTEN', 'START_BUSY', 'START_STILL', 'START_FAILED']) words[name] = constWord(copy, name);
  words.unreadable = literalAt(pocket, ['POCKET_WRITE_SENTENCES'], 'unreadable');
  words.busy = literalAt(pocket, ['POCKET_WRITE_SENTENCES'], 'busy');
  words.stopped = literalAt(pocket, ['POCKET_WRITE_SENTENCES'], 'stopped');
  words.newTitle = literalAt(pocket, ['POCKET_NEW_ROUTE_WORDS', 'start'], 'title');
  words.newSentence = literalAt(pocket, ['POCKET_NEW_ROUTE_WORDS', 'start'], 'sentence');
  words.clause = literalAt(pocket, ['POCKET_HONESTY_ADDED'], 'start');
  // THE PROBE REVIEW (rule 9): the honesty sentence's own opening, so S0 reads THAT sentence, never the Allow line
  // beside it in the same block, which says the same clause (`WRITE_CLAUSES.start` in src/main/pocket/pairing.ts).
  words.doorHonesty = constWord(pocket, 'POCKET_DOOR_HONESTY');
  return words;
}

/** The status code at the head of a raw HTTP answer, or 0 when nothing came. */
export function statusOfBytes(bytes) {
  const m = /^HTTP\/1\.1 (\d{3})/.exec(Buffer.from(bytes ?? Buffer.alloc(0)).toString('latin1'));
  return m === null ? 0 : Number(m[1]);
}

/**
 * A head-only exchange, read (THE PROBE REVIEW, rule 9): the status at the
 * head of what came back; `0` ONLY when the handshake held and nothing at all
 * came back before the idle timeout, which is a door waiting for the body; and
 * `-1` for anything else that carried no status (a handshake refused, a
 * connection the door closed with nothing, bytes that are no answer). Before
 * the review a dead connection also read `0`, so S0's control could pass on a
 * door that answered nothing for another reason.
 */
export function headOnlyReading(got) {
  const status = statusOfBytes(got?.bytes);
  if (status !== 0) return status;
  return got?.handshook === true && got?.error === 'timed out' && Buffer.from(got?.bytes ?? Buffer.alloc(0)).length === 0 ? 0 : -1;
}

/** The `q` quantile (nearest rank) of a list of numbers, or null. */
export function quantile(values, q) {
  const xs = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  return xs[Math.min(xs.length - 1, Math.max(0, Math.ceil(q * xs.length) - 1))];
}
const spreadOf = (xs) => ({ n: xs.length, p50: quantile(xs, 0.5), p95: quantile(xs, 0.95), max: xs.length === 0 ? null : Math.max(...xs) });

/** This file's own spelling of the name rule (SPEC D13, D14): `<base>-<n>` past the project's largest, then `-2`, `-3`… past a name it holds. */
export function nameFor(base, names) {
  const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`);
  let max = 0;
  for (const n of names) {
    const m = re.exec(n);
    if (m !== null) max = Math.max(max, Number(m[1]));
  }
  const want = `${base}-${String(max + 1)}`;
  const taken = new Set(names);
  let name = want;
  for (let k = 2; taken.has(name); k += 1) name = `${want}-${String(k)}`;
  return name;
}

/** A project's place: its machine, or `local` (SPEC §4.6). */
export const placeOf = (project) => (typeof project.machineId === 'string' && project.machineId !== '' && project.machineId !== 'local' ? project.machineId : 'local');
/** Whether a session belongs to a project: its folder and its machine (the renderer's `sameTarget`). */
export const inProject = (s, project) => s.projectPath === project.path && (s.machine?.id ?? 'local') === placeOf(project);

/** The 200-character clip the door gives every drawn string (`clipSessionText`). */
export function clip(text) {
  const s = String(text);
  if (s.length <= 200) return s;
  let keep = 199;
  const last = s.charCodeAt(keep - 1);
  if (last >= 0xd800 && last <= 0xdbff) keep -= 1;
  return `${s.slice(0, keep)}…`;
}

/**
 * D10, re-derived: the open project holding the session with the latest
 * `createdAt` (ties by the larger id); with none, the first listed project;
 * with no project, null.
 */
export function chosenOf(projects, sessions) {
  let best = null;
  for (const s of sessions) {
    const p = projects.find((x) => inProject(s, x));
    if (p === undefined) continue;
    if (best === null || s.createdAt > best.s.createdAt || (s.createdAt === best.s.createdAt && s.id > best.s.id)) best = { s, p };
  }
  if (best !== null) return best.p.id;
  return projects[0]?.id ?? null;
}

/**
 * The offer this file expects from main's own lists (SPEC D7, D8): the
 * projects in main's order, one place per place they name (`local` first),
 * each place's installed agents in registry order, and every agent any place
 * lists, once, in registry order. `folder` is graded apart (`folderProblems`).
 */
export function expectedOffer({ projects, machineLabels, places, rows }) {
  const order = rows.map((r) => r.id);
  const outProjects = projects.map((p) => ({ id: p.id, label: clip(p.name), machine: placeOf(p) === 'local' ? null : clip(machineLabels[placeOf(p)] ?? placeOf(p)), place: placeOf(p) }));
  const ids = [...new Set(outProjects.map((p) => p.place))].sort((a, b) => (a === 'local' ? -1 : b === 'local' ? 1 : 0));
  const outPlaces = ids.map((id) => {
    const at = places[id] ?? { ready: false, read: false, agents: [] };
    return { id, ready: at.ready === true, read: at.read === true, agents: order.filter((a) => (at.agents ?? []).includes(a)) };
  });
  const listed = new Set(outPlaces.flatMap((p) => p.agents));
  const outAgents = rows.filter((r) => listed.has(r.id)).map((r) => ({ id: r.id, name: clip(r.name), icon: r.icon }));
  return { projects: outProjects, places: outPlaces, agents: outAgents };
}

/** `folder` (SPEC D7): a string exactly when another listed project shares the label and the machine; else null. */
export function folderProblems(offerProjects) {
  const problems = [];
  for (const p of offerProjects ?? []) {
    const twin = offerProjects.some((q) => q !== p && q.label === p.label && q.machine === p.machine);
    if (twin && !(typeof p.folder === 'string' && p.folder !== '')) problems.push(`${p.label}: shares its label and machine and names no folder`);
    if (!twin && p.folder !== null) problems.push(`${p.label}: names a folder ${J(p.folder)} with no twin`);
  }
  return problems;
}

/** Whether an answer acted, the way main logs it (SPEC D32, writes.ts step 7). */
export function actedOf(a, { repeat = false } = {}) {
  if (a?.status !== 200 || a.ok !== true) return a?.status === 0 ? 'unknown' : 'no';
  if (repeat || a.outcome === 'busy') return 'no';
  if (a.outcome === 'refused' && (a.reason === 'malformed' || a.reason === 'often')) return 'no';
  return 'yes';
}

// ---------------------------------------------------------------------------
// THE INSTALLS FENCE (Phase 346's fix round): what the app would run, decided
// before anything is launched and again before every start
// ---------------------------------------------------------------------------

/**
 * The folders a stand-in may shadow a real copy in: Tortie's two compiled
 * system install folders (`extraBinDirsFor`'s `/opt/homebrew/bin` and
 * `/usr/local/bin`), which no scratch HOME can move. A copy there BEHIND its
 * stand-in is only version-probed by the app's detection scan; it is never the
 * file a create runs. Anything else outside the run, and above all anything
 * under the person's home, refuses the run.
 */
export const SHADOW_DIRS = Object.freeze(['/opt/homebrew/bin', '/usr/local/bin']);

/** The first executable copy of the first name that has one, along a walk, as the create resolves it; `skip` is a path treated as gone. */
export function createPick(names, walk, isExec, skip = null) {
  for (const name of names ?? []) {
    for (const dir of walk ?? []) {
      if (typeof dir !== 'string' || dir === '') continue;
      const at = join(dir, name);
      if (at !== skip && isExec(at)) return at;
    }
  }
  return null;
}

/** Whether `path` is inside `root` (or is it). */
const withinRun = (root, path) => typeof path === 'string' && typeof root === 'string' && root !== '' && (path === root || path.startsWith(`${root}/`));

/**
 * THE INSTALLS VERDICT over the checkout's own merge and resolver (read through
 * the pinned tsx by `readInstalls`): for every compiled launchable row, every
 * copy of every candidate name along the walk the app makes. `{ ok, said,
 * problems, shadows }`.
 *
 *  - each of the eight runs ITS stand-in: the create's pick is `<bin>/<name>`;
 *  - every other copy of every candidate of the eight is inside the run, or is
 *    the launched name's copy in a SHADOW_DIRS folder behind its stand-in
 *    (printed as a shadow: detection asks it its version, nothing runs it);
 *  - another candidate name of a row (CodeWhale's `codew` and `deepseek`) has
 *    no copy outside the run at all, so removing a stand-in can never hand the
 *    create a real program (the run of 2026-10-16 started his real DeepSeek CLI
 *    exactly that way);
 *  - every launchable row that is not one of the eight has no copy anywhere.
 */
export function installsVerdict(out, { run, bin, binOf, eight }) {
  if (out === null || typeof out !== 'object' || !Array.isArray(out.rows)) return { ok: false, said: 'the installs read printed nothing readable', problems: ['unreadable'], shadows: [] };
  const problems = [];
  const shadows = [];
  if (out.parseProblems !== 0 || out.mergeProblems !== 0) problems.push(`the overlay did not load whole (${String(out.parseProblems)} parse, ${String(out.mergeProblems)} merge problem(s))`);
  for (const id of eight) if (!out.rows.some((r) => r.id === id)) problems.push(`${id} is not a compiled launchable row`);
  for (const row of out.rows) {
    const copies = row.copies ?? {};
    const isEight = eight.includes(row.id);
    if (isEight) {
      const want = join(bin, binOf[row.id]);
      const pick = (row.binaries ?? []).map((b) => (copies[b] ?? [])[0]).find((x) => typeof x === 'string') ?? null;
      if (pick !== want) problems.push(`${row.id}: the create would run ${J(pick)}, not its stand-in ${want}`);
    }
    for (const name of row.binaries ?? []) {
      (copies[name] ?? []).forEach((at, i) => {
        if (withinRun(run, at)) return;
        const shadow = isEight && name === binOf[row.id] && i > 0 && SHADOW_DIRS.includes(dirname(at));
        if (shadow) shadows.push(at);
        else problems.push(`${row.id}: ${isEight ? (name === binOf[row.id] ? `a real ${name} at ${at} is not behind its stand-in in a system install folder` : `its other name ${name} resolves to a real ${at}, which a create would run once the stand-in went`) : `a real ${at} resolves for a row this run never launches`}`);
      });
    }
  }
  return problems.length === 0
    ? { ok: true, said: `every launchable row resolves inside the run${shadows.length === 0 ? '' : `; shadowed behind a stand-in and only version-probed: ${shadows.join(', ')}`}`, problems, shadows }
    : { ok: false, said: problems.join('; '), problems, shadows };
}

/**
 * THE GUARD every start asks before it sends (Phase 346's fix round): a start
 * on the machine names Claude Code or Codex, whose far stand-ins this run
 * wrote, and nothing else (the loopback machine is this Mac, and Tortie's far
 * scan finds the real `/opt/homebrew/bin/omp` there); a start here whose row
 * the create would resolve outside the run is never sent. `null` when it may
 * go, else why not.
 */
export function startRefusal({ remote, agent, rowWalk, rowNames, isExec, run }) {
  if (remote) return agent === 'claude' || agent === 'codex' ? null : `a start of ${J(agent)} on the machine, where only Claude Code and Codex are this run's stand-ins`;
  if (!Array.isArray(rowNames)) return null;
  const pick = createPick(rowNames, rowWalk, isExec);
  return pick === null || withinRun(run, pick) ? null : `the create would run ${pick}, which is not this run's`;
}

/** One machine's agents view out of `machines:agents(id, false)`, which answers `[view]`; null when there is none. */
export function machineAgentsViewOf(read) {
  if (read?.ok !== true) return null;
  const v = Array.isArray(read.value) ? read.value[0] : read.value;
  return v !== null && typeof v === 'object' && Array.isArray(v.agents) ? v : null;
}

// ---------------------------------------------------------------------------
// The graders: pure, over a recorded reading, each clause shown to fail
// ---------------------------------------------------------------------------

const deepEqual = (a, b) => J(a) === J(b);
const doneWith = (a) => a?.status === 200 && a.ok === true && a.outcome === 'done' && a.session !== null && typeof a.session?.id === 'string';
const refusedWith = (a, reason, sentence) => a?.status === 200 && a.ok === true && a.outcome === 'refused' && a.reason === reason && (sentence === undefined || a.sentence === sentence);
const busyWith = (a, sentence) => a?.status === 200 && a.ok === true && a.outcome === 'busy' && a.reason === null && a.sentence === sentence;

export const GRADERS = {
  S0P: {
    title: 'the parent has no start route',
    clauses: [
      ['/v1/start answers 404 before its body and to a whole request', (r) => r.headOnly === 404 && r.full === 404],
      ['nothing reached the parent\'s main', (r) => r.lines === 0 && r.sessionsDelta === 0],
      ['its sessions answer carries no start', (r) => r.sessionsStatus === 200 && r.hasStart === false]
    ]
  },
  S0: {
    title: 'start waits for exactly its Allow, then is answered',
    clauses: [
      ['an agreement is on record and start alone waits', (r) => r.before.confirmState === 'confirmed' && deepEqual(r.before.routesWaiting, ['start']) && !r.before.routesAllowed.includes('start')],
      ['the sessions answer says waiting', (r) => deepEqual(r.key, { state: 'waiting' })],
      ['/v1/start answers 404 before its body, and nothing reaches main', (r) => r.headOnly === 404 && r.full === 404 && r.lines === 0 && r.sessionsDelta === 0],
      ['the face says New: and its sentence above Allow', (r) => r.face.length === 1 && r.face[0].id === 'start' && r.face[0].title === `New: ${r.words.newTitle}` && r.face[0].sentence === r.words.newSentence && typeof r.drawn === 'string' && r.drawn.includes(r.face[0].title) && r.drawn.includes(r.words.newSentence)],
      ['Allow covers start and nothing waits', (r) => r.after.confirmState === 'confirmed' && r.after.routesWaiting.length === 0 && r.after.routesAllowed.includes('start')],
      ['the next read carries the offer, and the door now waits for a start\'s body', (r) => r.keyAfter?.state === 'offered' && r.control === 0],
      ['Settings then Phone\'s honesty sentence says the phone could start a session', (r) => Array.isArray(r.honesty) && typeof r.words.doorHonesty === 'string' && r.words.doorHonesty !== '' && typeof r.words.clause === 'string' && r.honesty.some((p) => typeof p === 'string' && p.startsWith(r.words.doorHonesty) && p.includes(r.words.clause))]
    ]
  },
  S1: {
    title: 'the offer is main\'s own lists, starting nothing',
    clauses: [
      ['the key is a whole offer', (r) => r.offer?.state === 'offered' && Array.isArray(r.offer.projects) && Array.isArray(r.offer.places) && Array.isArray(r.offer.agents)],
      ['its projects are main\'s open projects in main\'s order, with their labels, machines and folders', (r) => deepEqual(r.offer.projects.map(({ id, label, machine, place }) => ({ id, label, machine, place })), r.expect.projects) && folderProblems(r.offer.projects).length === 0],
      ['each place is ready and read as main says, listing exactly the agents installed there', (r) => deepEqual(r.offer.places, r.expect.places)],
      ['this Mac lists exactly the eight stand-ins, and no place a hidden agent', (r) => deepEqual(r.offer.places.find((p) => p.id === 'local')?.agents, EIGHT) && r.offer.places.every((p) => p.agents.every((a) => !HIDDEN_AGENT_IDS.includes(a)))],
      ['its agent rows are every listed agent once, in registry order, with the registry\'s name and mark', (r) => deepEqual(r.offer.agents.map(({ id, name, icon }) => ({ id, name, icon })), r.expect.agents)],
      ['chosen is the project of the latest session, else the first (D10)', (r) => r.chosenReads.length >= 2 && r.chosenReads.every((c) => c.got === c.want && c.want !== null)],
      ['defaultAgent is the Mac\'s default agent', (r) => r.offer.defaultAgent === r.settingsDefault && r.settingsDefault === 'claude'],
      ['no agent carries a danger line before one is sealed', (r) => r.offer.agents.every((a) => a.danger === null)]
    ]
  },
  S1D: {
    title: 'only a sealed launch default is said, and it reaches the start',
    clauses: [
      ['an unsealed safeguard-off default written to the file is dropped, and no line is said for it', (r) => r.unsealed.readBackEmpty === true && r.unsealed.got === null],
      ['a default sealed through the Settings window is said by its label', (r) => r.sealed.readBack === true && typeof r.sealed.label === 'string' && r.sealed.got === r.sealed.label],
      ['the sealed default reached the next Claude Code start\'s argv', (r) => Array.isArray(r.claudeArgv) && r.flagTokens.length > 0 && r.flagTokens.every((t) => r.claudeArgv.includes(t))]
    ]
  },
  S2: {
    title: 'one start per installed agent on this Mac',
    clauses: [
      ['eight starts, one per installed agent, each answered done with its session', (r) => r.rows.length === EIGHT.length && deepEqual(r.rows.map((x) => x.agent), EIGHT) && r.rows.every((x) => doneWith(x.answer))],
      ['each is named <agent>-<n> by the shared rule', (r) => r.rows.every((x) => x.answer.session?.name === x.wantName)],
      ['main lists each, with its agent, in the project', (r) => r.rows.every((x) => x.listed !== null && x.listed.agent === x.agent && x.listed.projectPath === r.project && x.listed.machine === null)],
      ['each manifest argv is what the started process saw, by the stand-in\'s own path', (r) => r.rows.every((x) => Array.isArray(x.argv) && x.argv[0] === x.binPath && x.logged !== null && deepEqual(x.argv.slice(1), x.logged.args))],
      ['each started in the project\'s folder', (r) => r.rows.every((x) => x.logged !== null && x.logged.cwd === r.project && x.cwd === r.project)],
      ['/v1/screen answers each terminal', (r) => r.rows.every((x) => x.screen === 200)],
      // THE PROBE REVIEW (rule 9): held across the WHOLE matrix and once more after it settled, so a move that
      // comes after a row's 600 ms read is seen; per row alone, a late move read as the next row's `macBefore`.
      ['the Mac\'s active project and session never moved', (r) => r.rows.length > 0 && r.rows[0].macBefore !== null && r.rows.every((x) => x.macBefore !== null && deepEqual(x.macBefore, x.macAfter) && deepEqual(x.macBefore, r.rows[0].macBefore)) && deepEqual(r.macEnd, r.rows[0].macBefore)]
    ]
  },
  S3: {
    title: 'Claude Code and Codex started on the machine, and a machine away refused',
    clauses: [
      ['each answered done with its session', (r) => r.rows.length === 2 && r.rows.every((x) => doneWith(x.answer))],
      ['main lists each on the machine, and the far server holds it', (r) => r.rows.every((x) => x.remote === true && x.far === true)],
      ['each far process was started as main recorded it', (r) => r.rows.every((x) => Array.isArray(x.argv) && x.logged !== null && x.argv[0] === x.binPath && deepEqual(x.argv.slice(1), x.logged.args) && x.logged.cwd === r.project)],
      ['with its sshd paused the offer says not ready and a start is refused machine', (r) => r.paused.notReady === true && refusedWith(r.paused.answer, 'machine', r.words.START_MACHINE_AWAY)],
      ['nothing started while it was paused, and every paused pid was resumed', (r) => r.paused.count > 0 && r.paused.resumed === r.paused.count && r.paused.sessionsDelta === 0 && r.paused.farDelta === 0]
    ]
  },
  S4: {
    title: 'every refusal said in the Mac\'s words, starting nothing',
    clauses: [
      ['a project closed after the offer is refused project', (r) => refusedWith(r.closed, 'project', r.words.START_PROJECT_GONE)],
      ['a hidden agent\'s id is refused agent', (r) => refusedWith(r.hidden, 'agent', r.words.START_AGENT_GONE)],
      ['shell and an id only agents.json could hold are malformed', (r) => [r.shell, r.overlay].every((a) => refusedWith(a, 'malformed', r.words.unreadable) && a.echoed === true)],
      ['an agent whose program went after the offer is refused agent, by the create\'s own code', (r) => r.removedWasOffered === true && refusedWith(r.removed, 'agent', r.words.START_AGENT_GONE)],
      ['none of them started anything', (r) => r.sessionsDelta === 0 && r.launches === 0]
    ]
  },
  S5: {
    title: 'how long a start takes, against the door\'s bound',
    clauses: [
      ['every start answered inside the door\'s 15 s', (r) => r.cold !== null && r.warm.length === WARM_STARTS && r.env.length === ENV_STARTS && r.remote.length === REMOTE_STARTS && r.answers.every((a) => a.status === 200 && a.outcome === 'done') && [r.cold, ...r.warm, ...r.env, ...r.remote].every((ms) => ms < ANSWER_BOUND_MS)],
      ['warm local p95 under 3 s', (r) => quantile(r.warm, 0.95) !== null && quantile(r.warm, 0.95) < WARM_P95_MS],
      ['remote p95 under 10 s', (r) => quantile(r.remote, 0.95) !== null && quantile(r.remote, 0.95) < REMOTE_P95_MS],
      // THE PROBE REVIEW (rule 9): with S2's muse start, made BEFORE the seal, as the control, so a variable every
      // session gets anyway (an environment Tortie hands every pane) cannot read as the seal's.
      ['the sealed shell variable name reached each of the five, and no start before the seal', (r) => r.envReached === ENV_STARTS && r.envControl === false]
    ]
  },
  S6: {
    title: 'a start happens once or not at all, within its limits',
    clauses: [
      ['the same bytes again: 404 and one session', (r) => doneWith(r.replay.first) && r.replay.again === 404 && r.replay.sessionsMade === 1],
      // THE PROBE REVIEW (rule 9): either of the two may reach main first; the one second is the duplicate.
      ['the same write id fresh-signed: busy while it runs, the recorded done after, one session', (r) => {
        const [d, b] = doneWith(r.still.first) ? [r.still.first, r.still.during] : [r.still.during, r.still.first];
        return doneWith(d) && busyWith(b, r.words.START_STILL) && doneWith(r.still.after) && r.still.after.session.id === d.session.id && r.still.sessionsMade === 1;
      }],
      ['an answer cut after the act, then the same id: the recorded done, one session', (r) => r.cut.cutStatus === 0 && r.cut.cuts >= 1 && r.cut.loggedBeforeCut === true && doneWith(r.cut.resent) && r.cut.sessionsMade === 1],
      ['two phones at once: one done, one busy, one session', (r) => {
        const [d, b] = doneWith(r.two.first) ? [r.two.first, r.two.second] : [r.two.second, r.two.first];
        return doneWith(d) && busyWith(b, r.words.START_BUSY) && r.two.sessionsMade === 1;
      }],
      ['seven starts from one phone in a minute: six done, the seventh refused often', (r) => r.seven.answers.length === 7 && r.seven.answers.slice(0, 6).every(doneWith) && refusedWith(r.seven.answers[6], 'often', r.words.START_OFTEN) && r.seven.withinMs < RATE_WINDOW_MS],
      ['the refused seventh was not recorded: its id acts once the window allows', (r) => doneWith(r.seven.later)]
    ]
  },
  S7: {
    title: 'one line per start, naming nothing a person said or chose',
    clauses: [
      ['one line per start that acted', (r) => r.appLogRead === true && r.acted > 0 && r.lines >= r.acted && r.lines <= r.acted + r.unknown],
      ['no start line names a project, a path, an agent, an argument, a write id or a sentence', (r) => r.lineHits.length === 0],
      ['no write id is in any file under the profile, HOME or the harness directory', (r) => r.filesScanned > 0 && r.writeIdHits.length === 0]
    ]
  },
  S8: {
    title: 'the Mac\'s menus do not move',
    clauses: [['the native application menu is the parent\'s', (r) => Array.isArray(r.parent) && r.parent.length > 0 && deepEqual(r.parent, r.head)]]
  },
  S9: {
    title: 'a start sets no status',
    clauses: [
      ['every started session was sampled', (r) => r.sessions >= EIGHT.length && r.samples >= r.sessions * 5],
      ['none read needs_input from the start itself', (r) => r.waiting.length === 0]
    ]
  },
  S10: {
    title: 'every session this run started is ended by main\'s own verbs',
    clauses: [
      ['each was ended and removed', (r) => r.started > 0 && r.ended === r.started && r.removed === r.started && r.leftListed === 0],
      // THE PROBE REVIEW (rule 9): this Mac's server too; `localLeft` was read and never graded.
      ['neither this Mac\'s server nor the far one holds any of them', (r) => r.farLeft === 0 && r.localLeft === 0]
    ]
  },
  RUN: {
    title: 'no real Tailscale, no real DNS, no vendor agent, nothing left',
    clauses: [
      ['the Tailscale preflight passed', (r) => r.tailscalePreflight === true],
      ['the DNS preflight passed at every launch', (r) => r.dnsPreflights.length > 0 && r.dnsPreflights.every(Boolean)],
      ['the hidden agents held at every launch', (r) => r.agentsHeld.length > 0 && r.agentsHeld.every(Boolean)],
      ['every bare name resolved to its stand-in and no hidden one resolved', (r) => r.resolved === true && r.hiddenUnresolved === true],
      // THE FIX ROUND: the run of 2026-10-16 passed every clause above and still started his real DeepSeek CLI.
      ['the installs fence held: every program a create could reach is this run\'s', (r) => r.installs === true],
      ['every session the manifest holds ran a program of this run', (r) => r.manifest?.read === true && Array.isArray(r.manifest.outside) && r.manifest.outside.length === 0],
      ['no real Tailscale in any sample', (r) => r.realTailscale === 0 && r.samples > 0],
      ['nothing forbidden reached the stand-in', (r) => r.forbidden === 0],
      ['every stand-in ended and nothing of this run is left', (r) => r.standinLeft === 0 && r.agentsLeft === 0 && r.runLeft === 0],
      ['his shell history did not move across the run', (r) => typeof r.history.before === 'string' && r.history.before !== '' && r.history.before === r.history.after]
    ]
  }
};

/**
 * THE PROBE REVIEW (docs/method/HOW-WE-BUILT-THIS.md rule 9): a reading that
 * is missing what an arm's clauses need is UNREADABLE, never a pass and never
 * the product's failure. Each entry answers why, or null when the reading can
 * be graded. Asked before the clauses, by `verdictOf`, which `arm` calls.
 */
export const UNREADABLE_WHEN = {
  // Only when the status itself was not read: a door that read its status and asked again is D2 failing, graded.
  S0: (r) => (r.statusRead === false ? 'the door\'s status was never read at HEAD, so start could not be seen waiting' : null),
  S1: (r) => (r.expectRead?.scan !== true ? 'main\'s agent scan was not read through the bridge, so there is no installed list to hold the offer to' : r.expectRead?.machine !== true ? 'the machine\'s agents were not read through the bridge' : r.expectRead?.machineState === false ? 'the machine\'s link and session feed were not read through the bridge, so whether it answers is unknown' : null),
  S1D: (r) =>
    r.unsealed?.flag === null || r.unsealed?.flag === undefined
      ? 'Codex\'s catalog names no verified safeguard-off preset, so no unsealed default was written'
      : !Array.isArray(r.claudeArgv)
        ? 'no Claude Code start was read after the seal (S2 did not run, or its claude row has no argv)'
        : null,
  S5: (r) => (r.cold === null || r.cold === undefined ? 'no cold start was read (S2 did not run)' : r.sealedEnv !== true ? 'the shell variable name did not seal through the Settings window, so the five muse starts asked the login shell nothing' : null),
  S6: (r) => (typeof r.seven?.withinMs === 'number' && r.seven.withinMs >= RATE_WINDOW_MS ? `the seven starts took ${String(r.seven.withinMs)} ms, past the ${String(RATE_WINDOW_MS)} ms window, so the limit was not tested` : null),
  S7: (r) => (r.appLogRead !== true ? 'app.log could not be read' : null),
  S8: (r) => (!Array.isArray(r.head) || r.head.length === 0 ? 'HEAD\'s application menu was not read over its inspector' : null),
  S9: (r) => (!(r.sessions >= EIGHT.length) ? `only ${String(r.sessions)} session(s) were started to sample (S2 did not run whole)` : null),
  S10: (r) => (!(r.started > 0) ? 'this run started no session to end' : null),
  // THE RULED ROUND: a manifest this run could not read, or a history file it could not stat, is no reading.
  RUN: (r) =>
    r.manifest?.read !== true
      ? `the manifest could not be read after the app was gone (${String(r.manifest?.why ?? 'no reading')}), so which programs its sessions ran is unknown`
      : typeof r.history?.before !== 'string' || typeof r.history?.after !== 'string' || r.history.before.split('|').includes('none') || r.history.after.split('|').includes('none')
        ? `his shell history could not be read (${J(r.history ?? null)}), so whether it moved is unknown`
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
// The fixtures: each grader's honest reading and one break per clause
// ---------------------------------------------------------------------------

const W = {
  START_PROJECT_GONE: 'That project is not open on your Mac any more. Nothing was started.',
  START_AGENT_GONE: 'That agent is not installed there. Nothing was started.',
  START_MACHINE_AWAY: 'Tortie is not connected to that project’s machine. Nothing was started.',
  START_OFTEN: 'Your phone started several sessions just now. Wait a minute, then try again. Nothing was started.',
  START_BUSY: 'Your Mac is starting another session. Nothing was started.',
  START_STILL: 'Your Mac is still starting this session.',
  unreadable: 'Your Mac could not read that request. Nothing was done.',
  newTitle: 'start sessions from your phone',
  newSentence: 'An agent installed where the project is, with your launch defaults.',
  clause: 'start a session in a project open in Tortie, on this Mac or another machine',
  doorHonesty: 'A phone you allow can see what any session’s terminal shows and what it printed before, type into it as you would at this Mac, answer a numbered question, send a session one message and end a session.'
};
const session = (n) => ({ id: `0000000${String(n)}-aaaa-4bbb-8ccc-dddddddddddd`, name: `claude-${String(n)}` });
const done = (n = 1) => ({ status: 200, ok: true, outcome: 'done', reason: null, sentence: null, session: session(n), echoed: true });
const refused = (reason, sentence) => ({ status: 200, ok: true, outcome: 'refused', reason, sentence, session: null, echoed: true });
const busy = (sentence) => ({ status: 200, ok: true, outcome: 'busy', reason: null, sentence, session: null, echoed: true });
const ROWS = EIGHT.map((id) => ({ id, name: `${id} name`, icon: id }));
const P_A = '/private/tmp/p346/projects/matrix';
const FIX_OFFER = {
  state: 'offered',
  projects: [
    { id: 'p-a', label: 'matrix', machine: null, folder: null, place: 'local' },
    { id: 'p-b', label: 'same', machine: null, folder: '/private/tmp/p346/projects/a/same', place: 'local' },
    { id: 'p-c', label: 'same', machine: null, folder: '/private/tmp/p346/projects/b/same', place: 'local' },
    { id: 'p-d', label: 'far', machine: 'p346 loopback', folder: null, place: MACHINE_ID }
  ],
  places: [
    { id: 'local', ready: true, read: true, agents: [...EIGHT] },
    { id: MACHINE_ID, ready: true, read: true, agents: ['claude', 'codex', 'omp'] }
  ],
  agents: ROWS.map((r) => ({ ...r, danger: null })),
  chosen: 'p-a',
  defaultAgent: 'claude'
};
const FIX_EXPECT = {
  projects: FIX_OFFER.projects.map(({ id, label, machine, place }) => ({ id, label, machine, place })),
  places: structuredClone(FIX_OFFER.places),
  agents: ROWS
};
const s2row = (agent, n) => ({ agent, answer: { ...done(n), session: { id: `id-${agent}`, name: `${agent}-1` } }, wantName: `${agent}-1`, listed: { agent, projectPath: P_A, machine: null }, argv: [`/bin/${BIN_OF[agent]}`, '--x'], binPath: `/bin/${BIN_OF[agent]}`, logged: { args: ['--x'], cwd: P_A }, cwd: P_A, screen: 200, macBefore: { project: 'p0', session: 's0' }, macAfter: { project: 'p0', session: 's0' } });

export const GRADER_FIXTURES = {
  S0P: {
    pass: { headOnly: 404, full: 404, lines: 0, sessionsDelta: 0, sessionsStatus: 200, hasStart: false },
    breaks: {
      '/v1/start answers 404 before its body and to a whole request': (r) => void (r.headOnly = 0),
      'nothing reached the parent\'s main': (r) => void (r.lines = 1),
      'its sessions answer carries no start': (r) => void (r.hasStart = true)
    },
    refused: [{ what: 'a parent whose sessions read failed (nothing was read)', clause: 'its sessions answer carries no start', edit: (r) => void (r.sessionsStatus = 404) }]
  },
  S0: {
    pass: {
      words: W,
      before: { confirmState: 'confirmed', routesWaiting: ['start'], routesAllowed: ['pair', 'blocked'] },
      key: { state: 'waiting' },
      headOnly: 404,
      full: 404,
      lines: 0,
      sessionsDelta: 0,
      face: [{ id: 'start', title: `New: ${W.newTitle}`, sentence: W.newSentence }],
      drawn: `New: ${W.newTitle}${W.newSentence}`,
      after: { confirmState: 'confirmed', routesWaiting: [], routesAllowed: ['pair', 'blocked', 'start'] },
      keyAfter: { state: 'offered' },
      control: 0,
      honesty: ['Anyone with a paired phone can do what these lines say.', `${W.doorHonesty} It can also ${W.clause}.`]
    },
    breaks: {
      'an agreement is on record and start alone waits': (r) => void (r.before.routesWaiting = []),
      'the sessions answer says waiting': (r) => void (r.key = FIX_OFFER),
      '/v1/start answers 404 before its body, and nothing reaches main': (r) => void (r.headOnly = 0),
      'the face says New: and its sentence above Allow': (r) => void (r.face = []),
      'Allow covers start and nothing waits': (r) => void (r.after.routesWaiting = ['start']),
      'the next read carries the offer, and the door now waits for a start\'s body': (r) => void (r.control = 404),
      'Settings then Phone\'s honesty sentence says the phone could start a session': (r) => void (r.honesty = [W.doorHonesty])
    },
    refused: [
      { what: 'a start main was handed while it waited', clause: '/v1/start answers 404 before its body, and nothing reaches main', edit: (r) => void (r.lines = 1) },
      { what: 'the drafted 333.12.1 sentence (Claude Code or Codex only)', clause: 'the face says New: and its sentence above Allow', edit: (r) => void (r.face[0].sentence = 'Your phone could start Claude Code or Codex in a project here.') },
      { what: 'the pairing Allow allowing start too', clause: 'an agreement is on record and start alone waits', edit: (r) => void r.before.routesAllowed.push('start') },
      // THE PROBE REVIEW (rule 9): the clause said by the Allow line alone, which the old whole-block read passed.
      { what: 'the clause said by the Allow line and not by the honesty sentence', clause: 'Settings then Phone\'s honesty sentence says the phone could start a session', edit: (r) => void (r.honesty = [`Lets an allowed phone end a session and ${W.clause}`, W.doorHonesty]) },
      { what: 'a door that closed the head-only control with nothing (-1), not one waiting for a body', clause: 'the next read carries the offer, and the door now waits for a start\'s body', edit: (r) => void (r.control = -1) }
    ]
  },
  S1: {
    pass: { offer: FIX_OFFER, expect: FIX_EXPECT, chosenReads: [{ got: 'p-a', want: 'p-a' }, { got: 'p-a', want: 'p-a' }], settingsDefault: 'claude' },
    breaks: {
      'the key is a whole offer': (r) => void (r.offer.state = 'waiting'),
      'its projects are main\'s open projects in main\'s order, with their labels, machines and folders': (r) => void r.offer.projects.reverse(),
      'each place is ready and read as main says, listing exactly the agents installed there': (r) => void (r.offer.places[1].ready = false),
      'this Mac lists exactly the eight stand-ins, and no place a hidden agent': (r) => {
        r.offer.places[0].agents = [...EIGHT, 'gemini'];
        r.expect.places[0].agents = [...EIGHT, 'gemini'];
      },
      'its agent rows are every listed agent once, in registry order, with the registry\'s name and mark': (r) => void (r.offer.agents[2].icon = 'terminal'),
      'chosen is the project of the latest session, else the first (D10)': (r) => void (r.chosenReads[1].got = 'p-b'),
      'defaultAgent is the Mac\'s default agent': (r) => void (r.offer.defaultAgent = 'codex'),
      'no agent carries a danger line before one is sealed': (r) => void (r.offer.agents[0].danger = 'Skip permissions')
    },
    refused: [
      { what: 'a project with a twin that names no folder', clause: 'its projects are main\'s open projects in main\'s order, with their labels, machines and folders', edit: (r) => void (r.offer.projects[1].folder = null) },
      { what: 'a project with no twin that names a folder', clause: 'its projects are main\'s open projects in main\'s order, with their labels, machines and folders', edit: (r) => void (r.offer.projects[0].folder = '/x') },
      { what: 'only one chosen read (the matrix never moved it)', clause: 'chosen is the project of the latest session, else the first (D10)', edit: (r) => void r.chosenReads.pop() },
      { what: 'a place whose agents are an installed one short', clause: 'each place is ready and read as main says, listing exactly the agents installed there', edit: (r) => void r.offer.places[0].agents.pop() }
    ]
  },
  S1D: {
    pass: { sealed: { agent: 'claude', flag: '--dangerously-skip-permissions', label: 'Skip permissions', readBack: true, got: 'Skip permissions' }, unsealed: { agent: 'codex', flag: '--yolo', readBackEmpty: true, got: null }, claudeArgv: ['/bin/claude', '--settings', 'x', '--dangerously-skip-permissions'], flagTokens: ['--dangerously-skip-permissions'] },
    breaks: {
      'an unsealed safeguard-off default written to the file is dropped, and no line is said for it': (r) => void (r.unsealed.got = 'YOLO'),
      'a default sealed through the Settings window is said by its label': (r) => void (r.sealed.got = null),
      'the sealed default reached the next Claude Code start\'s argv': (r) => void (r.claudeArgv = ['/bin/claude'])
    },
    refused: [{ what: 'a seal that never read back (nothing was sealed)', clause: 'a default sealed through the Settings window is said by its label', edit: (r) => void (r.sealed.readBack = false) }]
  },
  S2: {
    pass: { project: P_A, rows: EIGHT.map((a, i) => s2row(a, i + 1)), macEnd: { project: 'p0', session: 's0' } },
    breaks: {
      'eight starts, one per installed agent, each answered done with its session': (r) => void (r.rows[3].answer = refused('agent', W.START_AGENT_GONE)),
      'each is named <agent>-<n> by the shared rule': (r) => void (r.rows[1].answer.session.name = 'Cursor CLI-1'),
      'main lists each, with its agent, in the project': (r) => void (r.rows[2].listed = null),
      'each manifest argv is what the started process saw, by the stand-in\'s own path': (r) => void (r.rows[4].logged.args = ['--x', '--y']),
      'each started in the project\'s folder': (r) => void (r.rows[5].logged.cwd = '/private/tmp'),
      '/v1/screen answers each terminal': (r) => void (r.rows[6].screen = 404),
      'the Mac\'s active project and session never moved': (r) => void (r.rows[7].macAfter = { project: 'p0', session: 'new' })
    },
    refused: [
      { what: 'an argv[0] that is not the stand-in (a real agent ran)', clause: 'each manifest argv is what the started process saw, by the stand-in\'s own path', edit: (r) => void (r.rows[0].argv[0] = '/Users/x/.local/bin/claude') },
      { what: 'a start on a machine where this Mac was asked', clause: 'main lists each, with its agent, in the project', edit: (r) => void (r.rows[0].listed.machine = MACHINE_ID) },
      { what: 'a hidden agent among the starts', clause: 'eight starts, one per installed agent, each answered done with its session', edit: (r) => void (r.rows[3].agent = 'gemini') },
      // THE PROBE REVIEW (rule 9): a move that came after a row's read, seen by the next row and by the last read.
      { what: 'a move after row 2 was read, seen as row 3 onward\'s before and after', clause: 'the Mac\'s active project and session never moved', edit: (r) => { for (const x of r.rows.slice(3)) Object.assign(x, { macBefore: { project: 'p0', session: 'id-codex' }, macAfter: { project: 'p0', session: 'id-codex' } }); r.macEnd = { project: 'p0', session: 'id-codex' }; } },
      { what: 'a move after the last row, seen only by the read once the matrix settled', clause: 'the Mac\'s active project and session never moved', edit: (r) => void (r.macEnd = { project: 'p-matrix', session: 'id-opencode' }) }
    ]
  },
  S3: {
    pass: {
      words: W,
      project: '/private/tmp/p346/far',
      rows: ['claude', 'codex'].map((agent, i) => ({ agent, answer: done(i + 1), remote: true, far: true, argv: [`/far/${agent}`, '--x'], binPath: `/far/${agent}`, logged: { args: ['--x'], cwd: '/private/tmp/p346/far' } })),
      paused: { count: 3, resumed: 3, notReady: true, answer: refused('machine', W.START_MACHINE_AWAY), sessionsDelta: 0, farDelta: 0 }
    },
    breaks: {
      'each answered done with its session': (r) => void (r.rows[1].answer = { status: 0, ok: false }),
      'main lists each on the machine, and the far server holds it': (r) => void (r.rows[0].far = false),
      'each far process was started as main recorded it': (r) => void (r.rows[1].logged = null),
      'with its sshd paused the offer says not ready and a start is refused machine': (r) => void (r.paused.answer = done(9)),
      'nothing started while it was paused, and every paused pid was resumed': (r) => void (r.paused.resumed = 2)
    },
    refused: [{ what: 'a pause the offer never read (nothing was tested)', clause: 'with its sshd paused the offer says not ready and a start is refused machine', edit: (r) => void (r.paused.notReady = false) }]
  },
  S4: {
    pass: { words: W, closed: refused('project', W.START_PROJECT_GONE), hidden: refused('agent', W.START_AGENT_GONE), shell: refused('malformed', W.unreadable), overlay: refused('malformed', W.unreadable), removedWasOffered: true, removed: refused('agent', W.START_AGENT_GONE), sessionsDelta: 0, launches: 0 },
    breaks: {
      'a project closed after the offer is refused project': (r) => void (r.closed = done()),
      'a hidden agent\'s id is refused agent': (r) => void (r.hidden = refused('malformed', W.unreadable)),
      'shell and an id only agents.json could hold are malformed': (r) => void (r.shell = done()),
      'an agent whose program went after the offer is refused agent, by the create\'s own code': (r) => void (r.removed = { status: 200, ok: true, outcome: 'failed', reason: null, sentence: 'x', session: null }),
      'none of them started anything': (r) => void (r.launches = 1)
    },
    refused: [
      { what: 'a removed program the offer had already dropped (the create was never asked)', clause: 'an agent whose program went after the offer is refused agent, by the create\'s own code', edit: (r) => void (r.removedWasOffered = false) },
      { what: 'a malformed answer that did not echo the id', clause: 'shell and an id only agents.json could hold are malformed', edit: (r) => void (r.overlay.echoed = false) }
    ]
  },
  S5: {
    pass: { cold: 900, warm: Array.from({ length: WARM_STARTS }, (_, i) => 300 + i), env: Array.from({ length: ENV_STARTS }, () => 700), remote: Array.from({ length: REMOTE_STARTS }, () => 1_800), answers: Array.from({ length: WARM_STARTS + ENV_STARTS + REMOTE_STARTS }, () => ({ status: 200, outcome: 'done' })), envReached: ENV_STARTS, envControl: false, sealedEnv: true },
    breaks: {
      'every start answered inside the door\'s 15 s': (r) => void (r.answers[4] = { status: 0, outcome: null }),
      'warm local p95 under 3 s': (r) => void (r.warm = r.warm.map(() => 3_400)),
      'remote p95 under 10 s': (r) => void (r.remote = r.remote.map(() => 11_000)),
      'the sealed shell variable name reached each of the five, and no start before the seal': (r) => void (r.envReached = 4)
    },
    refused: [
      { what: 'a timing arm short of its count', clause: 'every start answered inside the door\'s 15 s', edit: (r) => void r.warm.pop() },
      // THE PROBE REVIEW (rule 9): the variable in every pane anyway, so its arrival says nothing of the seal.
      { what: 'the variable in S2\'s muse start, made before the seal', clause: 'the sealed shell variable name reached each of the five, and no start before the seal', edit: (r) => void (r.envControl = true) },
      { what: 'no control read (S2\'s muse start recorded nothing)', clause: 'the sealed shell variable name reached each of the five, and no start before the seal', edit: (r) => void (r.envControl = null) }
    ]
  },
  S6: {
    pass: {
      words: W,
      replay: { first: done(1), again: 404, sessionsMade: 1 },
      still: { first: done(2), during: busy(W.START_STILL), after: done(2), sessionsMade: 1 },
      cut: { cutStatus: 0, cuts: 1, loggedBeforeCut: true, resent: done(3), sessionsMade: 1, how: { via: 'the door closed its side', heldBytes: 412, heldStatus: 200 } },
      two: { first: done(4), second: busy(W.START_BUSY), sessionsMade: 1 },
      seven: { answers: [...Array.from({ length: 6 }, (_, i) => done(5 + i)), refused('often', W.START_OFTEN)], withinMs: 4_000, later: done(11) }
    },
    breaks: {
      'the same bytes again: 404 and one session': (r) => void (r.replay.sessionsMade = 2),
      'the same write id fresh-signed: busy while it runs, the recorded done after, one session': (r) => void (r.still.after = done(7)),
      'an answer cut after the act, then the same id: the recorded done, one session': (r) => void (r.cut.sessionsMade = 2),
      'two phones at once: one done, one busy, one session': (r) => void (r.two.second = done(9)),
      'seven starts from one phone in a minute: six done, the seventh refused often': (r) => void (r.seven.answers[6] = done(12)),
      'the refused seventh was not recorded: its id acts once the window allows': (r) => void (r.seven.later = refused('often', W.START_OFTEN))
    },
    refused: [
      { what: 'the busy said in the door\'s words where a start runs elsewhere', clause: 'two phones at once: one done, one busy, one session', edit: (r) => void (r.two.second = busy('Tortie is still doing the last thing you asked from this phone. Nothing was done.')) },
      { what: 'a cut that came before the act (nothing was tested)', clause: 'an answer cut after the act, then the same id: the recorded done, one session', edit: (r) => void (r.cut.loggedBeforeCut = false) },
      { what: 'no cut the relay counted (the answer was lost some other way)', clause: 'an answer cut after the act, then the same id: the recorded done, one session', edit: (r) => void (r.cut.cuts = 0) }
    ]
  },
  S7: {
    pass: { appLogRead: true, lines: 40, acted: 39, unknown: 1, lineHits: [], filesScanned: 300, writeIdHits: [] },
    breaks: {
      'one line per start that acted': (r) => void (r.lines = 38),
      'no start line names a project, a path, an agent, an argument, a write id or a sentence': (r) => void r.lineHits.push({ line: 3, names: 'the project id' }),
      'no write id is in any file under the profile, HOME or the harness directory': (r) => void r.writeIdHits.push({ file: 'profile/logs/app.log' })
    },
    refused: [{ what: 'a line for a start that never acted', clause: 'one line per start that acted', edit: (r) => void (r.lines = 42) }]
  },
  S8: {
    pass: { parent: ['Tortie > About Tortie', 'Session > New Session'], head: ['Tortie > About Tortie', 'Session > New Session'] },
    breaks: { 'the native application menu is the parent\'s': (r) => void r.head.push('Session > Start From Phone') },
    refused: [{ what: 'no parent menu read', clause: 'the native application menu is the parent\'s', edit: (r) => void (r.parent = null) }]
  },
  S9: {
    pass: { sessions: 8, samples: 80, waiting: [] },
    breaks: {
      'every started session was sampled': (r) => void (r.samples = 10),
      'none read needs_input from the start itself': (r) => void r.waiting.push('id-claude')
    }
  },
  S10: {
    pass: { started: 50, ended: 50, removed: 50, leftListed: 0, farLeft: 0, localLeft: 0 },
    breaks: {
      'each was ended and removed': (r) => void (r.removed = 49),
      'neither this Mac\'s server nor the far one holds any of them': (r) => void (r.farLeft = 1)
    },
    refused: [{ what: 'a session left on this Mac\'s tmux server', clause: 'neither this Mac\'s server nor the far one holds any of them', edit: (r) => void (r.localLeft = 1) }]
  },
  RUN: {
    pass: { tailscalePreflight: true, dnsPreflights: [true, true], agentsHeld: [true, true], resolved: true, hiddenUnresolved: true, installs: true, manifest: { read: true, rows: 52, outside: [] }, realTailscale: 0, samples: 900, forbidden: 0, standinLeft: 0, agentsLeft: 0, runLeft: 0, history: { before: '737736 1792023873|23166 1790702242', after: '737736 1792023873|23166 1790702242' } },
    breaks: {
      'the installs fence held: every program a create could reach is this run\'s': (r) => void (r.installs = false),
      'every session the manifest holds ran a program of this run': (r) => void (r.manifest.outside = [{ id: 'deepseek-2', argv0: '/Users/someone/.npm-global/bin/deepseek' }]),
      'the Tailscale preflight passed': (r) => void (r.tailscalePreflight = false),
      'the DNS preflight passed at every launch': (r) => void (r.dnsPreflights = [true, false]),
      'the hidden agents held at every launch': (r) => void (r.agentsHeld = []),
      'every bare name resolved to its stand-in and no hidden one resolved': (r) => void (r.hiddenUnresolved = false),
      'no real Tailscale in any sample': (r) => void (r.realTailscale = 1),
      'nothing forbidden reached the stand-in': (r) => void (r.forbidden = 1),
      'every stand-in ended and nothing of this run is left': (r) => void (r.runLeft = 2),
      'his shell history did not move across the run': (r) => void (r.history.after = '738000 1792029999|23166 1790702242')
    }
  }
};

/** Every grader on its fixtures, and the pure readers on texts of their own. Starts nothing. */
function graderSelfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  const clauses = gradeFixtures({ graders: GRADERS, fixtures: GRADER_FIXTURES, grade, clone: (x) => structuredClone(x), say, J });
  // The pure readers.
  say(constWord("export const A = 'one';\nexport const B: string =\n  'two, ' +\n  \"three.\";\n", 'B') === 'two, three.', 'constWord reads a concatenation over a line break');
  say(literalAt("export const X = Object.freeze({ start: { title: 'a b', sentence: 'c d.' } });", ['X', 'start'], 'sentence') === 'c d.' && literalAt('const Y = {}', ['X'], 'k') === null, 'literalAt reads a nested literal and answers null for a missing anchor');
  say(statusOfBytes(Buffer.from('HTTP/1.1 404 Not Found\r\n\r\n')) === 404 && statusOfBytes(Buffer.alloc(0)) === 0, 'statusOfBytes reads a status line and 0 for nothing');
  say(nameFor('claude', ['claude-1', 'claude-3', 'pi-2']) === 'claude-4' && nameFor('pi', []) === 'pi-1' && nameFor('a.b', ['aXb-5']) === 'a.b-1', 'nameFor takes one past the largest and escapes its base');
  say(nameFor('pi', ['pi-1', 'pi-2-x', 'pi-2']) === 'pi-3', 'nameFor ignores a name that only starts like an ordinal');
  {
    const projects = [{ id: 'a', path: '/a', name: 'a' }, { id: 'b', path: '/b', name: 'b', machineId: 'm' }];
    const sessions = [{ id: 's1', projectPath: '/a', createdAt: 5 }, { id: 's2', projectPath: '/b', createdAt: 9, machine: { id: 'm' } }, { id: 's9', projectPath: '/gone', createdAt: 99 }];
    say(chosenOf(projects, sessions) === 'b', 'chosenOf takes the project of the latest session on an open project');
    say(chosenOf(projects, [{ id: 's1', projectPath: '/a', createdAt: 9 }, { id: 's2', projectPath: '/b', createdAt: 9, machine: { id: 'm' } }]) === 'b', 'chosenOf breaks a tie by the larger session id');
    say(chosenOf(projects, []) === 'a' && chosenOf([], []) === null, 'chosenOf falls back to the first project, then to null');
    say(chosenOf(projects, [{ id: 's3', projectPath: '/b', createdAt: 50 }]) === 'a', 'chosenOf does not count a session at the same path on another machine');
  }
  {
    const e = expectedOffer({
      projects: [{ id: 'r', path: '/far', name: 'far', machineId: 'm' }, { id: 'l', path: '/l', name: 'l' }],
      machineLabels: { m: 'M' },
      places: { local: { ready: true, read: true, agents: ['pi', 'claude'] }, m: { ready: false, read: false, agents: [] } },
      rows: [{ id: 'claude', name: 'C', icon: 'claude' }, { id: 'pi', name: 'P', icon: 'pi' }, { id: 'omp', name: 'O', icon: 'omp' }]
    });
    say(deepEqual(e.places.map((p) => p.id), ['local', 'm']) && deepEqual(e.places[0].agents, ['claude', 'pi']), 'expectedOffer puts local first and the agents in registry order');
    say(deepEqual(e.agents.map((a) => a.id), ['claude', 'pi']) && e.projects[0].machine === 'M', 'expectedOffer lists each agent once and names a project\'s machine');
  }
  say(folderProblems([{ label: 'x', machine: null, folder: null }, { label: 'x', machine: 'M', folder: null }]).length === 0, 'folderProblems: one label on two machines is no twin');
  say(clip('a'.repeat(201)).length === 200 && clip('a'.repeat(200)).length === 200 && clip(`${'a'.repeat(198)}😀b`).endsWith('…'), 'clip cuts at 200 characters and never splits a surrogate pair');
  say(actedOf({ status: 200, ok: true, outcome: 'refused', reason: 'project' }) === 'yes' && actedOf({ status: 200, ok: true, outcome: 'refused', reason: 'often' }) === 'no' && actedOf({ status: 200, ok: true, outcome: 'busy' }) === 'no' && actedOf({ status: 0 }) === 'unknown' && actedOf({ status: 404 }) === 'no', 'actedOf counts a verb\'s refusal and no often, busy or 404');
  say(actedOf({ status: 200, ok: true, outcome: 'done' }, { repeat: true }) === 'no', 'actedOf counts no ledger repeat');
  // THE FIX ROUND: the installs fence, the start guard and the machine view, over planted readings.
  {
    const run = '/scratch/run';
    const bin = `${run}/home/.local/bin`;
    const ctx = { run, bin, binOf: { claude: 'claude', deepseek: 'codewhale', omp: 'omp' }, eight: ['claude', 'deepseek', 'omp'] };
    const honest = () => ({
      parseProblems: 0,
      mergeProblems: 0,
      rows: [
        { id: 'claude', binaries: ['claude'], copies: { claude: [`${bin}/claude`] } },
        { id: 'deepseek', binaries: ['codewhale', 'codew', 'deepseek'], copies: { codewhale: [`${bin}/codewhale`], codew: [], deepseek: [] } },
        { id: 'omp', binaries: ['omp'], copies: { omp: [`${bin}/omp`, '/opt/homebrew/bin/omp'] } },
        { id: 'gemini', binaries: ['p346-never-gemini'], copies: { 'p346-never-gemini': [] } }
      ]
    });
    const v0 = installsVerdict(honest(), ctx);
    say(v0.ok === true && deepEqual(v0.shadows, ['/opt/homebrew/bin/omp']), 'installsVerdict: the stand-ins first and a system-folder copy behind one is a printed shadow, never a refusal');
    const deep = honest();
    deep.rows[1].copies.deepseek = ['/Users/someone/.npm-global/bin/deepseek'];
    say(installsVerdict(deep, ctx).ok === false, 'installsVerdict: a row\'s other name resolving to a real program (2026-10-16\'s DeepSeek CLI) refuses the run');
    const homeShadow = honest();
    homeShadow.rows[0].copies.claude = [`${bin}/claude`, '/Users/someone/.local/bin/claude'];
    say(installsVerdict(homeShadow, ctx).ok === false, 'installsVerdict: a real copy under a home, even behind the stand-in, refuses the run');
    const first = honest();
    first.rows[2].copies.omp = ['/opt/homebrew/bin/omp', `${bin}/omp`];
    say(installsVerdict(first, ctx).ok === false, 'installsVerdict: a real program the create would pick before its stand-in refuses the run');
    const hidden = honest();
    hidden.rows[3].copies['p346-never-gemini'] = ['/usr/local/bin/p346-never-gemini'];
    say(installsVerdict(hidden, ctx).ok === false && installsVerdict(null, ctx).ok === false, 'installsVerdict: any copy of a row this run never launches, and an unreadable read, refuse the run');
    const files = new Set([`${bin}/codewhale`, '/elsewhere/deepseek']);
    const exec = (p) => files.has(p);
    say(createPick(['codewhale', 'codew', 'deepseek'], [bin, '/elsewhere'], exec) === `${bin}/codewhale` && createPick(['codewhale', 'codew', 'deepseek'], [bin, '/elsewhere'], exec, `${bin}/codewhale`) === '/elsewhere/deepseek', 'createPick walks the names in order, then the folders, and a skipped stand-in exposes what comes after it');
    say(startRefusal({ remote: false, agent: 'deepseek', rowWalk: [bin, '/elsewhere'], rowNames: ['codewhale', 'codew', 'deepseek'], isExec: exec, run }) === null, 'startRefusal: a local start whose create runs the stand-in goes');
    say(typeof startRefusal({ remote: false, agent: 'deepseek', rowWalk: ['/elsewhere'], rowNames: ['codewhale', 'codew', 'deepseek'], isExec: exec, run }) === 'string', 'startRefusal: a local start whose create would run a program outside the run is never sent');
    say(startRefusal({ remote: true, agent: 'claude', isExec: exec, run }) === null && typeof startRefusal({ remote: true, agent: 'omp', isExec: exec, run }) === 'string', 'startRefusal: on the machine only Claude Code and Codex are sent');
    say(startRefusal({ remote: false, agent: 'shell', rowWalk: null, rowNames: null, isExec: exec, run }) === null, 'startRefusal: an id no row holds (a malformed start) is sent, since nothing can run it');
    say(machineAgentsViewOf({ ok: true, value: [{ agents: [], askedAt: 1 }] })?.askedAt === 1 && machineAgentsViewOf({ ok: true, value: { agents: [], askedAt: 2 } })?.askedAt === 2 && machineAgentsViewOf({ ok: true, value: [] }) === null && machineAgentsViewOf({ ok: false }) === null, 'machineAgentsViewOf reads machines:agents\' [view] (and a bare view), and null for nothing');
  }
  // The tree's words this run reads, read from the tree itself.
  const words = wordsOf(ROOT);
  const missing = Object.entries(words).filter(([, v]) => typeof v !== 'string' || v === '').map(([k]) => k);
  say(missing.length === 0, `every word the run grades on is in the tree${missing.length === 0 ? '' : ` (missing ${J(missing)}: the mac builder's half)`}`);
  say(words.newTitle === W.newTitle && words.newSentence === W.newSentence && words.clause === W.clause, 'the fixtures\' face words and clause are the tree\'s, byte for byte');
  say(words.doorHonesty === W.doorHonesty, `the honesty sentence's opening is the tree's POCKET_DOOR_HONESTY, byte for byte (${J(words.doorHonesty)})`);
  // THE PROBE REVIEW (rule 9): the head-only reading, and the verdict that asks UNREADABLE first.
  say(headOnlyReading({ handshook: true, bytes: Buffer.alloc(0), error: 'timed out' }) === 0, 'headOnlyReading: a handshake that held and nothing back by the idle timeout is a door waiting (0)');
  say(headOnlyReading({ handshook: false, bytes: Buffer.alloc(0), error: 'socket hang up' }) === -1 && headOnlyReading({ handshook: true, bytes: Buffer.alloc(0), error: null }) === -1 && headOnlyReading({ handshook: true, bytes: Buffer.from('garbage'), error: 'timed out' }) === -1 && headOnlyReading(undefined) === -1, 'headOnlyReading: a refused handshake, a close with nothing and bytes that are no answer are -1, never 0');
  say(headOnlyReading({ handshook: true, bytes: Buffer.from('HTTP/1.1 404 Not Found\r\ncontent-length: 0\r\n\r\n'), error: null }) === 404, 'headOnlyReading: a 404 is 404');
  say(verdictOf('S2', null).state === 'unreadable' && verdictOf('S7', { appLogRead: false }).state === 'unreadable' && verdictOf('S1D', { unsealed: null, claudeArgv: [] }).state === 'unreadable', 'verdictOf: no reading, and a reading missing what the clauses need, are UNREADABLE');
  // THE RULED ROUND: RUN over a manifest it could not read, or a history file it could not stat, is no reading.
  {
    const run = structuredClone(GRADER_FIXTURES.RUN.pass);
    say(verdictOf('RUN', structuredClone(run)).state === 'pass', 'verdictOf: RUN\'s honest reading passes');
    say(verdictOf('RUN', { ...structuredClone(run), manifest: { read: false, rows: 0, outside: [], why: 'unable to open database file (14)' } }).state === 'unreadable', 'verdictOf: RUN over a manifest that could not be read is UNREADABLE, never a failure');
    say(verdictOf('RUN', { ...structuredClone(run), history: { before: 'none|none', after: 'none|none' } }).state === 'unreadable', 'verdictOf: RUN with his history unread (the scratch HOME\'s none|none) is UNREADABLE, never a pass');
    say(verdictOf('RUN', { ...structuredClone(run), history: { before: run.history.before, after: '738000 1792029999|23166 1790702242' } }).state === 'fail', 'verdictOf: RUN with his history moved is a failure');
  }
  // THE PROBE REVIEW'S OWN RECORDED FIXTURES (rule 9), in fixtures/reviewer/:
  // an honest reading per grader written from the source, and broken readings,
  // each the honest one with ONE thing wrong, each answering EXACTLY what it
  // names (the clauses it fails, or UNREADABLE), two of them honest readings in
  // the other order that must pass.
  {
    let honest = null;
    let broken = null;
    try {
      honest = JSON.parse(readFileSync(join(ROOT, 'build', 'p346', 'fixtures', 'reviewer', 'honest.json'), 'utf8')).readings;
      broken = JSON.parse(readFileSync(join(ROOT, 'build', 'p346', 'fixtures', 'reviewer', 'broken.json'), 'utf8'));
    } catch (err) {
      say(false, `the review's fixtures did not load: ${String(err?.message ?? err)}`);
    }
    if (honest !== null && broken !== null) {
      const at = (obj, path) => {
        const keys = path.split('.');
        let o = obj;
        for (const k of keys.slice(0, -1)) o = o[/^\d+$/.test(k) ? Number(k) : k];
        return { o, k: /^\d+$/.test(keys.at(-1)) ? Number(keys.at(-1)) : keys.at(-1) };
      };
      const apply = (reading, ops) => {
        for (const op of ops) {
          if (op.set !== undefined) {
            const { o, k } = at(reading, op.set);
            o[k] = structuredClone(op.value);
          } else if (op.push !== undefined) {
            const { o, k } = at(reading, op.push);
            o[k].push(structuredClone(op.value));
          } else if (op.swap !== undefined) {
            const a = at(reading, op.swap[0]);
            const b = at(reading, op.swap[1]);
            const t = a.o[a.k];
            a.o[a.k] = b.o[b.k];
            b.o[b.k] = t;
          } else throw new Error(`an op this reader does not know: ${J(op)}`);
        }
        return reading;
      };
      for (const id of Object.keys(GRADERS)) {
        const v = verdictOf(id, structuredClone(honest[id]));
        say(v.state === 'pass', `the review's honest ${id} passes${v.state === 'pass' ? '' : ` (it read ${v.state}: ${J(v.failed)} ${v.why ?? ''})`}`);
      }
      const reached = new Set();
      for (const c of broken) {
        if (GRADERS[c.arm] === undefined) {
          say(false, `the review's broken reading "${c.name}" names ${String(c.arm)}, which is no arm`);
          continue;
        }
        const unknown = (c.mustFail ?? []).filter((name) => !GRADERS[c.arm].clauses.some(([cl]) => cl === name));
        if (unknown.length > 0) {
          say(false, `the review's broken ${c.arm} "${c.name}" names ${J(unknown)}, which no clause of its grader is`);
          continue;
        }
        let v;
        try {
          v = verdictOf(c.arm, apply(structuredClone(honest[c.arm]), c.ops));
        } catch (err) {
          say(false, `the review's broken ${c.arm} "${c.name}" could not be applied: ${String(err?.message ?? err)}`);
          continue;
        }
        const want = J([...(c.mustFail ?? [])].sort());
        const got = J([...v.failed].sort());
        const right = c.expect === 'fail' ? v.state === 'fail' && want === got : v.state === c.expect;
        say(right, `${c.arm} answers ${c.expect.toUpperCase()}${c.expect === 'fail' ? ` on exactly ${want}` : ''} for the review's reading: ${c.name}${right ? '' : ` (it read ${v.state}: ${got} ${v.why ?? ''})`}`);
        if (c.expect !== 'pass') reached.add(c.arm);
      }
      const missing = Object.keys(GRADERS).filter((id) => !reached.has(id));
      say(missing.length === 0, `the review's broken readings reach every grader (${String(reached.size)} of ${String(Object.keys(GRADERS).length)}${missing.length === 0 ? '' : `; none for ${J(missing)}`})`);
    }
  }
  say(words.START_BUSY === W.START_BUSY && words.START_STILL === W.START_STILL && words.START_OFTEN === W.START_OFTEN && words.START_AGENT_GONE === W.START_AGENT_GONE && words.START_PROJECT_GONE === W.START_PROJECT_GONE && words.START_MACHINE_AWAY === W.START_MACHINE_AWAY && words.unreadable === W.unreadable, 'the fixtures\' sentences are the tree\'s, byte for byte');
  // The tree's route list holds start (the probe's 404 arms are about it).
  const treeIds = [...(/POCKET_ROUTE_IDS = \[([\s\S]*?)\] as const/.exec(readFileSync(join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts'), 'utf8'))?.[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  say(treeIds.includes('start') && treeIds.length === 12, `the tree's POCKET_ROUTE_IDS name start, twelve in all (${String(treeIds.length)})`);
  say(EIGHT.every((a) => typeof BIN_OF[a] === 'string') && ARGV_STANDIN_BINS.every((b) => Object.values(BIN_OF).includes(b)) && !EIGHT.some((a) => HIDDEN_AGENT_IDS.includes(a)), 'the eight bins are the argv stand-in\'s six and the p318 stand-in\'s two, none hidden');
  process.stdout.write(failures === 0 ? `[p346] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown to go red on its own break.\n` : `[p346] grader self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The refusals, in the order they are asked
// ---------------------------------------------------------------------------

const TAG = '[p346]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
/**
 * His shell history's size and modified time, and nothing else of it. THE
 * RULED ROUND: the home is the ACCOUNT's (`os.userInfo().homedir`), never
 * `$HOME`, which the brief makes a scratch folder; under it this read
 * "none|none" both times and passed testing nothing. A file that is missing
 * reads `none`, and RUN is then UNREADABLE.
 */
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
if (SOCKET === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p346`, which wraps this file in build/harness-socket.mjs and build/with-scratch-machine.mjs.');
if (SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET.startsWith('gmux-p346')) refuse(`"${SOCKET}" is not a gmux-p346 harness socket.`);
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
for (const v of ['SCRATCH_MACHINE_QUIET_SHELL', 'SCRATCH_MACHINE_SCRATCH_HOME', 'SCRATCH_MACHINE_NO_OWN_KEYS']) {
  if ((process.env[v] ?? '') !== '1') refuse(`${v} is not 1: the loopback machine would read his own rc files, home or keys. Run it through \`npm run probe:p346\`.`);
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
const FAR_TMUX = String(carriage.remoteTmuxPath ?? '');
if (!existsSync(FAR_TMUX)) refuse(`the carriage's tmux ${J(FAR_TMUX)} does not exist.`);
/** The far HOME the yard lends its sessions (build/scratch-machine.mjs `scratchHomeFor`). */
const FAR_HOME = join(CONFIG_ROOT, 'home');
if (!existsSync(FAR_HOME)) refuse(`the machine's scratch home ${FAR_HOME} does not exist, so its far side would be his own home.`);

const PARENT = (process.env['P346_PARENT_CHECKOUT'] ?? '').trim();
const KEEP = (process.env['P346_KEEP'] ?? '') === '1';
const ARMS = new Set(((process.env['P346_ARMS'] ?? '').trim() || 'S0,S1,S1D,S2,S3,S4,S5,S6,S7,S8,S9,S10').split(',').map((s) => s.trim()));
const on = (id) => ARMS.has(id);
/** The sources a HEAD reading is made of; out/ older than any of them is refused. */
const SOURCES = [
  'src/main/sessions/pocket-start.ts',
  'src/main/sessions/pocket-writes.ts',
  'src/main/pocket/writes.ts',
  'src/main/pocket/routes.ts',
  'src/main/pocket/facts.ts',
  'src/main/pocket/ipc.ts',
  'src/main/pocket/door/table.ts',
  'src/main/pocket/door/wire.ts',
  'src/main/pocket/route-ledger.ts',
  'src/main/capabilities.ts',
  'src/shared/ipc/pocket.ts',
  'src/shared/start-copy.ts'
];
for (const checkout of [ROOT, ...(PARENT === '' ? [] : [resolve(PARENT)])]) {
  const bundle = join(checkout, 'out', 'main', 'index.js');
  if (!existsSync(bundle)) refuse(`${bundle} is missing. Build that checkout first.`);
  if (checkout === ROOT) {
    const newer = SOURCES.filter((s) => existsSync(join(ROOT, s)) && statSync(join(ROOT, s)).mtimeMs > statSync(bundle).mtimeMs);
    if (newer.length > 0) refuse(`out/ is older than ${newer.join(', ')}; build first.`);
  }
}

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------

mkdirSync(join(HARNESS_DIR, 'p346'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p346'));
const HOME = join(RUN, 'home');
const PROFILE = join(RUN, 'profile');
const PROJECTS = join(RUN, 'projects');
const FAR = join(RUN, 'far');
const BIN = join(HOME, '.local', 'bin');
const FAR_BIN = join(FAR_HOME, '.local', 'bin');
/** OUTSIDE the profile, so the helper's profile sweep never takes the stand-ins for the app's. */
const STANDIN_DIR = join(RUN, 'standin');
const ARGV_DIR = join(RUN, 'argv');
const APP_LOG = join(PROFILE, 'logs', 'app.log');
const MANIFEST = join(PROFILE, 'gmux', 'manifest.db');
const MACHINES_JSON = join(PROFILE, 'gmux', 'config', 'machines.json');
const SETTINGS_JSON = join(PROFILE, 'settings.json');
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const FAR_ENV = { ...process.env, TMUX_TMPDIR: carriage.tmuxTmp };
const OUT = join(ROOT, 'out', 'p346');
/** The scratch login PATH: the stand-ins and the system folders, nothing of his. */
const LOGIN_PATH = `${BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
/**
 * ONE `node`, a link to the node running this file, for the Electron shim's
 * `#!/usr/bin/env node` and nothing else. Never the folder that node lives in,
 * which on his Mac holds the agents he installed with npm.
 */
const NODE_BIN = join(RUN, 'nodebin');
/**
 * THE APP'S OWN PATH (Phase 346's fix round). Before it the app inherited the
 * PATH of whoever ran the probe, and Tortie's capture merges the app's own PATH
 * into every create's search: on 2026-10-16 that put his own install folders on
 * it, detection version-probed his real Claude Code, Cursor, Codex, Muse, pi,
 * omp and OpenCode, and S4's create, its CodeWhale stand-in removed, found his
 * real DeepSeek CLI by the row's other name and STARTED it. Now: the stand-ins,
 * that one `node`, and the system folders.
 */
const APP_PATH = `${BIN}:${NODE_BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
/** The variables the rows' own folders name (`$NVM_BIN`…), read from the registry; the app is given none of them. */
let rowDirVars = [];
/** The installs read (`readInstalls`) and its verdict, made before the first launch. */
let installs = null;
let installsOk = null;
const HIDDEN_PREFIX = 'p346';
const P = {
  matrix: join(PROJECTS, 'matrix'),
  timing: join(PROJECTS, 'timing'),
  ledger: join(PROJECTS, 'ledger'),
  close: join(PROJECTS, 'close'),
  twinA: join(PROJECTS, 'a', 'same'),
  twinB: join(PROJECTS, 'b', 'same')
};
const WORDS_HEAD = wordsOf(ROOT);

const report = { checkout: ROOT, parent: PARENT === '' ? null : resolve(PARENT), arms: [], readings: {}, answers: [] };
let failures = 0;
let unreadable = 0;
function arm(id, reading) {
  // THE PROBE REVIEW (rule 9): a reading missing what the clauses need is UNREADABLE, asked before any clause.
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
    report.arms.push({ id, ok: null, said: 'not run: P346_ARMS left it out' });
    return;
  }
  try {
    await body();
  } catch (err) {
    cannotRead(id, `the arm stopped: ${String(err?.message ?? err)}`);
  }
}

// ---------------------------------------------------------------------------
// The registry, read once through the pinned tsx before anything starts
// ---------------------------------------------------------------------------

/** Every compiled launchable row (registry order) and each one's verified safeguard-off presets. */
function readRegistry(checkout) {
  const script = [
    "import { AGENT_REGISTRY, LAUNCHABLE_AGENT_IDS } from './src/main/agents/registry.ts';",
    "import { AGENT_FLAG_PRESETS } from './src/main/agents/flags.ts';",
    'const ids = [...LAUNCHABLE_AGENT_IDS];',
    'const rows = ids.map((id) => AGENT_REGISTRY.find((e) => e.id === id)).filter((e) => e !== undefined).map((e) => ({ id: e.id, name: e.displayName, icon: e.iconKey, bin: e.launch?.argv?.[0] ?? null, binaries: e.binaries, extraProbeDirs: e.extraProbeDirs, probe: e.versionProbe }));',
    'const danger = {};',
    'for (const id of ids) danger[id] = ((AGENT_FLAG_PRESETS[id]?.presets) ?? []).filter((p) => p.danger && p.provenance === "VERIFIED").map((p) => ({ flag: p.flag, label: p.label }));',
    'process.stdout.write(JSON.stringify({ ids, rows, danger }));',
    ''
  ].join('\n');
  const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', '-'], { cwd: checkout, input: script, encoding: 'utf8', timeout: 120_000, env: { ...process.env, HOME } });
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
}

/**
 * THE INSTALLS READ (Phase 346's fix round), through the pinned tsx and the
 * checkout's OWN overlay merge, `expandDirs` and resolver: for every compiled
 * launchable row as the app merges it (the hidden five renamed), the walk a
 * create makes (the login shell's PATH, the app's own PATH, Tortie's install
 * folders and the system baseline, then the row's own folders and the install
 * folders again, exactly `captureLoginShellPath`'s merge and `resolveBinary`'s
 * extras) and every copy of every candidate name along it. The rows' `$VAR`
 * folders expand against an EMPTY environment, because the app is given none
 * of those variables (`launchOptions`). Nothing is run.
 */
function readInstalls(checkout, { home, loginPath, appPath }) {
  const script = [
    "import { parseAgentOverlay, mergeAgentOverlay } from './src/main/config/overlay.ts';",
    "import { AGENT_REGISTRY, LAUNCHABLE_AGENT_IDS } from './src/main/agents/registry.ts';",
    "import { expandDirs } from './src/main/agents/detection.ts';",
    "import { extraBinDirsFor, mergePathDirs, resolveBinaryAllAgainst, SYSTEM_PATH_DIRS } from './src/main/tmux/resolve.ts';",
    `const home = ${J(home)};`,
    `const userPath = mergePathDirs(${J(loginPath)}.split(':'), ${J(appPath)}.split(':'), extraBinDirsFor(home), SYSTEM_PATH_DIRS);`,
    `const parsed = parseAgentOverlay(${J(J(hiddenAgentsOverlay(HIDDEN_PREFIX)))});`,
    'const merged = mergeAgentOverlay(parsed.rows, AGENT_REGISTRY);',
    'const rows = [];',
    'for (const id of LAUNCHABLE_AGENT_IDS) {',
    '  const e = merged.agents.find((a) => a.id === id);',
    '  if (e === undefined) continue;',
    '  const extras = [...expandDirs(e.extraProbeDirs, {}, home), ...extraBinDirsFor(home)];',
    '  const copies = {};',
    '  for (const b of e.binaries) copies[b] = resolveBinaryAllAgainst(b, userPath, extras);',
    "  rows.push({ id, binaries: [...e.binaries], copies, walk: [...userPath.split(':'), ...extras] });",
    '}',
    'process.stdout.write(JSON.stringify({ parseProblems: parsed.problems.length, mergeProblems: merged.problems.length, userPath, rows }));',
    ''
  ].join('\n');
  const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', '-'], { cwd: checkout, input: script, encoding: 'utf8', timeout: 120_000, env: { ...process.env, HOME: home, PATH: appPath } });
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
}

/** Whether a path is something `resolveBinaryAgainst` would take: `accessSync(X_OK)`, exactly as it asks. */
function isExec(path) {
  try {
    accessSync(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The guards: the stand-ins, the samplers, the paused pids
// ---------------------------------------------------------------------------

let standin = null;
let dns = null;
let watch = null;
let relay = null;
let lastShim = 0;
let lastApp = 0;
let tailscalePreflight = false;
let resolvedOk = false;
let hiddenUnresolved = false;
const dnsPreflights = [];
const agentsHeld = [];
/** S3's paused pids, each resumed in the `finally` and on exit. */
const stopped = new Set();
function resumeStopped() {
  let resumed = 0;
  for (const pid of [...stopped]) {
    try {
      process.kill(pid, 'SIGCONT');
      resumed += 1;
    } catch {
      /* gone */
    }
    stopped.delete(pid);
  }
  return resumed;
}
process.on('exit', resumeStopped);
/** The program removed for S4, put back in the `finally` whatever happened. */
let removedProgram = null;
function restoreProgram() {
  if (removedProgram === null) return;
  try {
    writeFileSync(removedProgram.path, removedProgram.text, 'utf8');
    chmodSync(removedProgram.path, 0o755);
  } catch {
    /* the run is going anyway */
  }
  removedProgram = null;
}

/** The forwarder the stand-in's NEWEST live Funnel child listens on, or 0 (probe:p318's reading). */
const forwarderPort = () => standin?.readFunnel().at(-1)?.forwarderPort ?? 0;

/**
 * S6's relay: a phone dials it and it pipes to the CURRENT forwarder. In `cut`
 * mode it holds back the door's answer and, once `cutWhen()` says so (main
 * logged the act), destroys both sockets, so the phone sees no answer for a
 * start the Mac acted on. Closed, with every socket, in the `finally`.
 */
function makeRelay() {
  const sockets = new Set();
  let mode = 'pass';
  let cutWhen = () => false;
  let holding = false;
  let heldSince = 0;
  let cuts = 0;
  let lastCut = null;
  const server = createNetServer((client) => {
    sockets.add(client);
    const upstream = netConnect({ host: '127.0.0.1', port: forwarderPort() });
    sockets.add(upstream);
    const held = [];
    let timer = null;
    let counted = false;
    const end = () => {
      if (timer !== null) clearInterval(timer);
      client.destroy();
      upstream.destroy();
      sockets.delete(client);
      sockets.delete(upstream);
    };
    /**
     * A cut, counted ONCE per connection, whichever way it came (THE FIX ROUND): the probe's own timer, or the door
     * closing its side while this relay held the answer back, which the run of 2026-10-16 met (the door answers and
     * closes at once) and which `end` alone destroyed uncounted, so S6 read 0 cuts and no log over a cut that held.
     * The act's line is looked for until 3 s after the cut, because main writes it as it answers.
     */
    const cutNow = (via) => {
      if (counted) return;
      counted = true;
      cuts += 1;
      lastCut = { via, heldBytes: held.reduce((n, b) => n + b.length, 0), heldStatus: statusOfBytes(Buffer.concat(held)) };
      const until = Date.now() + 3_000;
      const look = () => {
        if (cutWhen() || Date.now() > until) return;
        setTimeout(look, 25);
      };
      look();
    };
    const holdingNow = () => mode === 'cut' && holding;
    client.on('data', (b) => upstream.write(b));
    upstream.on('data', (b) => (holdingNow() ? held.push(b) : client.write(b)));
    client.on('error', end);
    upstream.on('error', () => {
      if (holdingNow()) cutNow('the door\'s side failed');
      end();
    });
    client.on('close', end);
    upstream.on('close', () => {
      if (holdingNow()) cutNow('the door closed its side');
      end();
    });
    timer = setInterval(() => {
      if (!holdingNow()) return;
      if (cutWhen() || Date.now() - heldSince > 15_000) {
        cutNow('the probe');
        end();
      }
    }, 5);
  });
  return new Promise((resolveRelay) => {
    server.listen(0, '127.0.0.1', () => {
      resolveRelay({
        port: server.address().port,
        cut(when) {
          mode = 'cut';
          cutWhen = when;
          holding = false;
        },
        hold() {
          if (!holding) heldSince = Date.now();
          holding = true;
        },
        pass() {
          mode = 'pass';
          cutWhen = () => false;
          holding = false;
        },
        cuts: () => cuts,
        lastCut: () => lastCut,
        close() {
          for (const s of sockets) s.destroy();
          server.close();
        }
      });
    });
  });
}

/** The process table as pid → { ppid, command }, read with `ps -ww -ax` (never a pattern). */
function processTable() {
  const r = spawnSync('/bin/ps', ['-ww', '-ax', '-o', 'pid=,ppid=,command='], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  const rows = new Map();
  const children = new Map();
  for (const line of String(r.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m === null) continue;
    rows.set(Number(m[1]), { pid: Number(m[1]), ppid: Number(m[2]), command: m[3] });
    children.set(Number(m[2]), [...(children.get(Number(m[2])) ?? []), Number(m[1])]);
  }
  return { rows, children };
}
const descendantsOf = (children, pid) => {
  const out = [];
  const walk = (one) => {
    for (const c of children.get(one) ?? []) {
      walk(c);
      out.push(c);
    }
  };
  walk(pid);
  return out;
};
/** Whether `pid` is `root` or descends from it. */
function under(table, pid, root) {
  let at = pid;
  for (let i = 0; i < 12 && at > 1; i += 1) {
    if (at === root) return true;
    at = table.rows.get(at)?.ppid ?? 0;
  }
  return false;
}

// ---------------------------------------------------------------------------
// The app
// ---------------------------------------------------------------------------

const INHERITED = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_|CODEX_)/.test(n) || n === 'TERM_SESSION_ID').map((n) => [n, undefined]));

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
/** The MAIN process, over the node inspector `--inspect=0` opened (S8, as probe:p320's R5 reads it). */
async function attachMainProcess(handle, timeoutMs = 30_000) {
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
    if (Date.now() - started > timeoutMs) throw new Error('the main process inspector never appeared');
    await sleep(300);
  }
}
/** Every label of the application menu, submenus included, as `A > B`; `Open Recent`'s rows are what this run opened. */
const APP_MENU_READ = `JSON.stringify((() => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const { Menu } = load('electron');
  const top = Menu.getApplicationMenu();
  if (!top) return null;
  const out = [];
  const walk = (menu, path) => {
    for (const item of menu.items) {
      if (item.type === 'separator') continue;
      const label = String(item.label ?? '');
      const here = path === '' ? label : path + ' > ' + label;
      out.push(here);
      if (item.submenu && label !== 'Open Recent') walk(item.submenu, here);
    }
  };
  walk(top, '');
  return out;
})())`;
async function appMenu(handle) {
  let cdp = null;
  try {
    cdp = await attachMainProcess(handle);
    const r = await cdp.call('Runtime.evaluate', { expression: APP_MENU_READ, returnByValue: true, includeCommandLineAPI: true }, 20_000);
    return JSON.parse(String(r.result?.result?.value ?? 'null'));
  } catch {
    return null;
  } finally {
    cdp?.close();
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
  const got = await bridge(cdp, 'window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, name: s.name, tmuxName: s.tmuxName, status: s.status, agent: s.agent, projectPath: s.projectPath, cwd: s.cwd, createdAt: s.createdAt, machine: s.machine ? { id: s.machine.id } : null })))');
  return got.ok ? got.value : [];
}
async function projectsList(cdp) {
  const got = await bridge(cdp, 'window.gmux.projects.list()');
  return got.ok && Array.isArray(got.value) ? got.value : [];
}
/** The Mac's window: which project and session are in front. */
async function macState(cdp) {
  const got = await bridge(cdp, 'window.__gmuxP95.state()');
  return got.ok && got.value !== null ? { project: got.value.activeProjectId ?? null, session: got.value.activeSessionId ?? null } : null;
}

/**
 * Confirm the door as it stands and wait until a code may show. A parent
 * confirms its own lines; at HEAD with `start` waiting, the confirm is the
 * sheet's Allow (S0), so this is called only where no route waits.
 */
async function confirmDoor(cdp) {
  const now = await waitStatus(
    cdp,
    (s) => (s.state === 'listening' && s.confirmState === 'confirmed') || (s.confirmable === true && s.state !== 'opening' && s.confirmLines.some((l) => l.includes(`https://${PUBLIC_NAME}:`))),
    40_000
  );
  if (!now.ok) return { ok: false, why: `the lines never named ${PUBLIC_NAME}: ${J({ state: now.status?.state, refusal: now.status?.refusal })}`, lines: now.status?.confirmLines ?? [], before: now.status?.confirmState ?? null };
  const before = now.status.confirmState;
  const lines = now.status.confirmLines;
  if (!(now.status.state === 'listening' && now.status.confirmState === 'confirmed')) {
    const c = await pocket(cdp, 'confirmDoor', { linesRead: lines, hashRead: now.status.confirmHash });
    if (!c.ok || c.value.allowed !== true) return { ok: false, why: c.ok ? `confirm allowed=${String(c.value.allowed)}` : c.error, lines, before };
  }
  const l = await waitStatus(cdp, (s) => s.pairable === true || (s.pairable === undefined && s.state === 'listening'), 70_000);
  return { ok: l.ok, why: l.ok ? '' : `never pairable: ${J({ state: l.status?.state, pairable: l.status?.pairable })}`, lines, before };
}

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
  const viaRelay = { get port() { return relay?.port ?? 0; }, name: read.offer.host, publicPort: read.offer.port, pin: read.offer.fp };
  return { ok: first.status === 200, why: first.status === 200 ? '' : `the first read answered ${String(first.status)}`, label, phone, door, viaRelay };
}

/** The sessions answer's `start` key (absent reads `undefined`), and the read's status. */
async function startKey(Ph) {
  const r = await readSessions(Ph.phone, Ph.door);
  return { status: r.status, key: r.answer === null ? undefined : r.answer.start };
}
/** Wait until the key reads as `test` wants, bounded. */
const keyBecomes = (Ph, test, ms = 20_000) => waitFor(async () => {
  const k = await startKey(Ph);
  return test(k.key) ? k : null;
}, ms, 300);

const appLogText = () => {
  try {
    return readFileSync(APP_LOG, 'utf8');
  } catch {
    return null;
  }
};
const startLines = () => (appLogText() ?? '').split('\n').filter((l) => l.includes(START_LINE));

/** The manifest's argv and cwd for these session ids, read with macOS's own sqlite3, read only. */
function manifestRows(ids) {
  if (ids.length === 0 || !existsSync(MANIFEST)) return new Map();
  const list = ids.filter((id) => /^[A-Za-z0-9._:-]+$/.test(id)).map((id) => `'${id}'`).join(',');
  const r = spawnSync('/usr/bin/sqlite3', ['-readonly', '-json', MANIFEST, `select id, argv, cwd from sessions where id in (${list});`], { encoding: 'utf8', timeout: 20_000, maxBuffer: 16 * 1024 * 1024 });
  const out = new Map();
  try {
    for (const row of JSON.parse(String(r.stdout ?? '').trim() || '[]')) {
      let argv = null;
      try {
        argv = JSON.parse(row.argv);
      } catch {
        argv = null;
      }
      out.set(row.id, { argv, cwd: row.cwd });
    }
  } catch {
    /* an empty answer reads as no rows */
  }
  return out;
}

/**
 * THE FIX ROUND: every session row the manifest holds, read after the app is
 * gone, and the ones whose `argv[0]` is not a program of this run (the run's
 * folder, or the far HOME the yard lent it). `{ read, rows, outside, why }`.
 *
 * THE RULED ROUND: the fix round opened the app's own file with `sqlite3
 * -readonly`, which a WAL-mode database with no `-shm` left after the quit
 * refuses ("unable to open database file (14)"), so this clause could never
 * read and RUN failed over a run whose 51 rows were all the run's. It reads a
 * COPY beside its WAL now (build/scratch-login.mjs `manifestSessions`), and a
 * manifest it cannot read is UNREADABLE, never a failure.
 */
function manifestArgvOutside() {
  const m = manifestSessions(MANIFEST);
  if (!m.read) return { read: false, rows: 0, outside: [], why: m.why };
  const roots = [RUN, FAR_HOME];
  try {
    roots.push(realpathSync(FAR_HOME));
  } catch {
    /* the far HOME as written */
  }
  const outside = m.rows.filter((row) => !roots.some((root) => within(root, row.argv0))).map((row) => ({ id: row.id, name: row.name, argv0: row.argv0 }));
  return { read: true, rows: m.rows.length, outside, why: null };
}

/** One tmux read on the run's own scratch socket, here and on the machine. */
const tmuxOut = (...args) => {
  const r = spawnSync('tmux', ['-L', SOCKET, ...args], { encoding: 'utf8', timeout: 10_000 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
};
const farOut = (...args) => {
  const r = spawnSync(FAR_TMUX, ['-L', SOCKET, '-f', '/dev/null', ...args], { encoding: 'utf8', env: FAR_ENV, timeout: 10_000 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
};
/** `{ name → pane pid }` of one tmux server's sessions. */
function panesOf(out) {
  const m = new Map();
  for (const line of String(out ?? '').split('\n')) {
    const at = line.lastIndexOf(' ');
    if (at <= 0) continue;
    m.set(line.slice(0, at), Number(line.slice(at + 1)));
  }
  return m;
}
const localPanes = () => panesOf(tmuxOut('list-panes', '-a', '-F', '#{session_name} #{pane_pid}'));
const farPanes = () => panesOf(farOut('list-panes', '-a', '-F', '#{session_name} #{pane_pid}'));

/**
 * What the process a session runs saw when it started: the newest LAUNCH
 * record under that session's pane (its pid the pane's, or a descendant).
 * Read while the process is alive.
 */
function loggedFor(tmuxName, remote) {
  const panes = remote ? farPanes() : localPanes();
  const panePid = panes.get(tmuxName);
  if (panePid === undefined) return null;
  const table = processTable();
  const mine = readStartRecords(ARGV_DIR).filter((r) => r.kind === 'launch' && under(table, Number(r.pid), panePid));
  const rec = mine.at(-1) ?? null;
  if (rec === null) return null;
  let cwd = rec.cwd;
  try {
    cwd = realpathSync(rec.cwd);
  } catch {
    /* gone; compared as written */
  }
  return { args: rec.args, cwd, env: rec.env, pid: rec.pid };
}

function writeMachines(withMachine, path = MACHINES_JSON) {
  if (!path.startsWith(`${RUN}/`) && !path.startsWith(`${CONFIG_ROOT}/`)) throw new Error(`the machines file ${path} is outside this run's scratch world; nothing is written there`);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const machines = withMachine ? [{ id: MACHINE_ID, label: 'p346 loopback', host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: FAR_TMUX }] : [];
  writeFileSync(path, `${J({ schema: 1, machines })}\n`, 'utf8');
}

function launchOptions(label, checkout) {
  return {
    label,
    userDataDir: PROFILE,
    cwd: checkout,
    tmuxSocket: SOCKET,
    args: ['--remote-debugging-port=0', '--use-mock-keychain', '--inspect=0'],
    env: withoutDevRenderer({
      ...INHERITED,
      ...Object.fromEntries(rowDirVars.map((name) => [name, undefined])),
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

/** One launch through the helper, after both preflights and the hidden agents. */
async function launch(label, checkout, body) {
  const pre = preflightStandin(standin, standin.binPath);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused the launch: ${pre.problems.join('; ')}`);
  const dnsPre = await dns.preflight(dns.servers);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
  if (!dnsPre.ok) throw new Error(`the DNS preflight refused the launch: ${dnsPre.problems.join('; ')}`);
  // build/hidden-agents.mjs before EVERY launch: the checkout's own reader, then the file.
  const hiddenPre = hiddenAgentsPrecheck({ checkout, prefix: HIDDEN_PREFIX, home: HOME, userPath: `${LOGIN_PATH}:${APP_PATH}` });
  if (!hiddenPre.ok) {
    agentsHeld.push(false);
    throw new Error(`the hidden agents' precheck refused the launch: ${hiddenPre.said}`);
  }
  writeHiddenAgents(PROFILE, HIDDEN_PREFIX);
  return withElectron(launchOptions(label, checkout), async (handle) => {
    lastShim = handle.pid;
    const appNow = () => {
      try {
        lastApp = handle.appPid() || lastApp;
      } catch {
        /* not up yet */
      }
      return lastApp;
    };
    appNow();
    const main = await attachMain();
    appNow();
    try {
      // NO AGENT STARTS but the stand-ins: the hidden rows must read not installed.
      const list = JSON.parse(await cdpEval(main, AGENTS_LIST_EXPR, 120_000));
      const held = hiddenAgentsScanVerdict(list);
      agentsHeld.push(held.ok);
      if (!held.ok) throw new Error(`agents:list says a hidden agent resolved: ${held.said}`);
      await body(main, handle);
    } finally {
      main.close();
      appNow();
    }
  });
}

// ---------------------------------------------------------------------------
// The phone's starts, paced against the Mac's own rate (D16)
// ---------------------------------------------------------------------------

/** Every write id this run sent, for S7's scan. */
const sentWrites = new Set();
let acted = 0;
let actedUnknown = 0;
const paceStamps = new Map();
/** Wait until this phone has made fewer than RATE_MAX starts in the last window (a second of margin). */
async function pace(Ph) {
  for (;;) {
    const now = Date.now();
    const recent = (paceStamps.get(Ph.label) ?? []).filter((t) => now - t < RATE_WINDOW_MS + 1_000);
    paceStamps.set(Ph.label, recent);
    if (recent.length < RATE_MAX) return;
    await sleep(Math.max(250, RATE_WINDOW_MS + 1_000 - (now - recent[0])));
  }
}
const stampPace = (Ph) => paceStamps.set(Ph.label, [...(paceStamps.get(Ph.label) ?? []), Date.now()]);
const nonce = () => randomUUID().replace(/-/g, '');

/**
 * One start from a phone: its answer as the phone reads it (`startAnswerOf`),
 * the write id it sent and how long the answer took. `pace: false` sends at
 * once (an arm that measures the limit itself); `repeat: true` marks a ledger
 * repeat, which main does not log.
 */
/** The far project's id once the HEAD launch opened it, for the start guard. */
let farProjectId = null;
/** The start guard's answer for one start (`startRefusal`), over the installs read and this file's own walk. */
function startGuard(project, agent) {
  const remote = farProjectId !== null && project === farProjectId;
  const row = (installs?.rows ?? []).find((r) => r.id === agent) ?? null;
  return startRefusal({ remote, agent, rowWalk: row?.walk ?? null, rowNames: row?.binaries ?? null, isExec, run: RUN });
}

async function start(Ph, project, agent, { write = freshWriteId(), door = Ph.door, paced = true, repeat = false, nonce: once, timestamp, onWritten, body } = {}) {
  // THE START GUARD (Phase 346's fix round), asked before anything is sent: a throw stops the arm UNREADABLE.
  const refusedHere = startGuard(project, agent);
  if (refusedHere !== null) throw new Error(`nothing was sent: ${refusedHere}`);
  if (paced) await pace(Ph);
  sentWrites.add(write);
  const from = hr();
  const reply = await startSession(Ph.phone, door, { project, agent, write, nonce: once ?? nonce(), ...(timestamp === undefined ? {} : { timestamp }), ...(onWritten === undefined ? {} : { onWritten }), ...(body === undefined ? {} : { body }) });
  const ms = msBetween(from, hr());
  if (paced) stampPace(Ph);
  const read = startAnswerOf(reply, write);
  const a = read.ok ? read.answer : null;
  const out = { status: reply.status, ok: read.ok, why: read.why, outcome: a?.outcome ?? null, reason: a?.reason ?? null, sentence: a?.sentence ?? null, session: a?.session ?? null, echoed: read.ok, write, ms, body: reply.status === 200 ? reply.body : null };
  // EVERY session an answer says was made is ended by S10, whatever the arm expected (the fix round: S4's
  // unexpected `done` made deepseek-2, which only an expected `done` would have entered, and S10 passed over it).
  if (out.outcome === 'done' && typeof out.session?.id === 'string') started.set(out.session.id, { remote: farProjectId !== null && project === farProjectId });
  const did = actedOf(out, { repeat });
  if (did === 'yes') acted += 1;
  else if (did === 'unknown') actedUnknown += 1;
  report.answers.push({ project, agent, write, status: out.status, outcome: out.outcome, reason: out.reason, sentence: out.sentence, session: out.session, ms });
  return out;
}

/**
 * A start's head alone: the request line, the Host, the signature over the
 * body it names and its Content-Length, and NO body. A door that refuses the
 * route answers 404 before it reads a body; a door that serves it waits for
 * the body, so nothing comes inside the window (0).
 */
async function headOnly(Ph, project, agent) {
  const write = freshWriteId();
  sentWrites.add(write);
  const body = writeBodyOf({ agent, project, write });
  const headers = signedHeadersFor(Ph.phone, 'POST', '/v1/start', body);
  const head = [`POST /v1/start HTTP/1.1`, `host: ${Ph.door.name}:${String(Ph.door.publicPort)}`, ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`), 'content-type: application/json', `content-length: ${String(body.length)}`, '', ''].join('\r\n');
  const got = await rawExchange({ door: Ph.door, bytes: Buffer.from(head, 'latin1'), identity: Ph.phone, timeoutMs: 4_000 });
  return headOnlyReading(got);
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/** Every session id this run's starts made, for S9 and S10. */
const started = new Map();
const noteStarted = (a, remote) => {
  if (a?.session?.id !== undefined && a.outcome === 'done') started.set(a.session.id, { remote });
};
let registry = null;
let parentMenus = null;
let unsealedFlag = null;
let s10 = null;

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, PROFILE, PROJECTS, FAR, BIN, NODE_BIN, STANDIN_DIR, ARGV_DIR, FAR_BIN, ...Object.values(P)]) mkdirSync(dir, { recursive: true });
  symlinkSync(process.execPath, join(NODE_BIN, 'node'));
  for (const p of Object.values(P)) writeFileSync(join(p, 'README.md'), `# ${basename(p)}\n`);
  writeFileSync(join(FAR, 'README.md'), '# Phase 346, the far folder\n');

  // ---- the registry, through the pinned tsx --------------------------------
  registry = readRegistry(ROOT);
  if (registry === null || !Array.isArray(registry.rows)) throw new Error('the registry could not be read through the pinned tsx');
  const rowOf = (id) => registry.rows.find((r) => r.id === id);
  if (!EIGHT.every((id) => rowOf(id)?.bin === BIN_OF[id])) throw new Error(`the registry's launch names are not the eight this run answers: ${J(EIGHT.map((id) => [id, rowOf(id)?.bin]))}`);
  rowDirVars = [...new Set(registry.rows.flatMap((r) => (r.extraProbeDirs ?? []).flatMap((d) => [...String(d).matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g)].map((m) => m[1]))))];
  const identities = {};
  for (const id of EIGHT) {
    const r = rowOf(id);
    identities[r.bin] = { id, args: r.probe?.args ?? null, fallbackArgs: r.probe?.fallbackArgs ?? null, identitySubstring: r.probe?.identitySubstring ?? null };
  }
  writeIdentities(ARGV_DIR, identities);

  // ---- the stand-ins on the scratch PATH and the far one ---------------------
  const p318 = writeWrappers({ dir: RUN, bin: BIN, standinDir: STANDIN_DIR });
  writeLoggedWrappers({ bin: BIN, logDir: ARGV_DIR, runner: p318.runner });
  writeArgvWrappers({ bin: BIN, logDir: ARGV_DIR });
  writeLoggedWrappers({ bin: FAR_BIN, logDir: ARGV_DIR, runner: p318.runner });
  // tmux's execvp reads the LOGIN shell's PATH: the stand-ins and the system folders, nothing of his.
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${LOGIN_PATH}"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${LOGIN_PATH}"\nexport HISTFILE=/dev/null\nexport ${ENV_NAME}=p346-value\nPS1='p346 %# '\n`, 'utf8');
  writeFileSync(join(HOME, '.hushlogin'), '');
  writeMachines(true);
  {
    const known = join(PROFILE, 'gmux', 'machines', 'known-machines');
    mkdirSync(dirname(known), { recursive: true });
    writeFileSync(known, keyscanText({ host: carriage.host, port: carriage.port, caller: 'build/p346/probe-p346.mjs' }), 'utf8');
  }
  // THE PRECONDITION: the eight bare names are the stand-ins and the hidden five are nothing,
  // asked of the login shell the app will ask, with the environment the app will be given.
  {
    const shellEnv = { ...process.env, HOME, ZDOTDIR: HOME, HISTFILE: '/dev/null', PATH: APP_PATH };
    for (const name of [...Object.keys(INHERITED), ...rowDirVars]) delete shellEnv[name];
    const loginShell = (process.env['SHELL'] ?? '').trim() || '/bin/zsh';
    const ask = (bare) => (String(spawnSync(loginShell, ['-lic', `command -v ${bare} || true`], { encoding: 'utf8', timeout: 30_000, env: shellEnv }).stdout ?? '').trim().split('\n').pop() ?? '');
    const resolved = Object.fromEntries(EIGHT.map((id) => [BIN_OF[id], ask(BIN_OF[id])]));
    const hidden = Object.fromEntries(HIDDEN_BINS.map((b) => [b, ask(b)]));
    report.readings.resolves = { resolved, hidden };
    resolvedOk = Object.entries(resolved).every(([b, at]) => at === join(BIN, b));
    hiddenUnresolved = Object.values(hidden).every((at) => at === '');
    if (!resolvedOk || !hiddenUnresolved) {
      unreadable += 1;
      throw new Error(`the scratch login shell resolves ${J(resolved)} and the hidden ${J(hidden)}: a bare name is not its stand-in or a hidden agent resolves, so nothing is launched`);
    }
  }
  // THE INSTALLS FENCE (Phase 346's fix round): every name of every launchable row, along the walk the app's
  // create makes, through the checkout's own resolver. A real program a create could reach REFUSES the run.
  for (const checkout of [ROOT, ...(PARENT === '' ? [] : [resolve(PARENT)])]) {
    const read = readInstalls(checkout, { home: HOME, loginPath: LOGIN_PATH, appPath: APP_PATH });
    const v = installsVerdict(read, { run: RUN, bin: BIN, binOf: BIN_OF, eight: EIGHT });
    report.readings.installs = [...(report.readings.installs ?? []), { checkout, ok: v.ok, said: v.said, shadows: v.shadows, userPath: read?.userPath ?? null }];
    if (checkout === ROOT) installs = read;
    installsOk = (installsOk ?? true) && v.ok;
    if (!v.ok) {
      unreadable += 1;
      throw new Error(`the installs fence refused ${checkout}: ${v.said}. Nothing is launched`);
    }
    say(`installs (${checkout === ROOT ? 'HEAD' : 'parent'}): ${v.said}`);
  }
  standin = makeStandin({ dir: join(RUN, 'tailscale'), scenario: { ...DEFAULT_SCENARIO } });
  const pre = preflightStandin(standin, standin.binPath);
  tailscalePreflight = pre.ok;
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
  watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });
  relay = await makeRelay();
  say(`measuring ${ROOT}${PARENT === '' ? '' : ` after the parent ${PARENT}`}; socket ${SOCKET}; the loopback machine on ${String(carriage.host)}:${String(carriage.port)}`);

  // ======================================================================
  // S0P and S8's parent half — the parent, FIRST, on the same profile
  // ======================================================================
  if (PARENT !== '') {
    await launch('p346-parent', resolve(PARENT), async (main, handle) => {
      parentMenus = await appMenu(handle);
      await pocket(main, 'setDoor', { on: true });
      const door = await confirmDoor(main);
      if (!door.ok) return cannotRead('S0P', `the parent's door never listened: ${door.why}`);
      const Ph = await pairPhone(main, 'p346 parent phone');
      if (!Ph.ok) return cannotRead('S0P', `no phone paired with the parent: ${Ph.why}`);
      const projectsAtParent = await projectsList(main);
      const project = projectsAtParent[0]?.id ?? randomUUID();
      const linesBefore = startLines().length;
      const sessionsBefore = (await sessions(main)).length;
      const ho = await headOnly(Ph, project, 'claude');
      const full = await start(Ph, project, 'claude', { paced: false });
      await sleep(1_000);
      const sess = await readSessions(Ph.phone, Ph.door);
      arm('S0P', { headOnly: ho, full: full.status, lines: startLines().length - linesBefore, sessionsDelta: (await sessions(main)).length - sessionsBefore, sessionsStatus: sess.status, hasStart: sess.answer !== null && Object.hasOwn(sess.answer, 'start') });
    });
  } else cannotRead('S0P', 'no parent ran (P346_PARENT_CHECKOUT unset)');

  // An UNSEALED safeguard-off launch default, written into the file before HEAD reads it (S1D).
  {
    const codexDanger = registry.danger?.codex?.[0] ?? null;
    if (codexDanger !== null) {
      let file = {};
      try {
        file = JSON.parse(readFileSync(SETTINGS_JSON, 'utf8'));
      } catch {
        file = { version: 1 };
      }
      const settings = file.settings !== null && typeof file.settings === 'object' ? file.settings : {};
      settings.launchDefaults = { ...(settings.launchDefaults ?? {}), codex: [codexDanger.flag] };
      file.settings = settings;
      writeFileSync(SETTINGS_JSON, `${J(file, null, 2)}\n`, 'utf8');
      unsealedFlag = codexDanger;
    }
  }

  // ======================================================================
  // HEAD — S0 to S6, S8's head half, S9 and S10, one launch
  // ======================================================================
  await launch('p346-head', ROOT, async (main, handle) => {
    const headMenus = await appMenu(handle);
    if (on('S8')) {
      if (parentMenus === null) cannotRead('S8', PARENT === '' ? 'no parent ran (P346_PARENT_CHECKOUT unset)' : 'the parent\'s menu was not read over its inspector', { head: headMenus });
      else arm('S8', { parent: parentMenus, head: headMenus });
    }

    // ---- the projects, here and on the machine --------------------------------
    for (const p of [P.matrix, P.timing, P.ledger, P.twinA, P.twinB]) await bridge(main, `window.__p293.addProject(${J(p)})`);
    const up = await bridge(main, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
    if (!(up.ok && (up.value?.rows ?? []).some((row) => row.id === MACHINE_ID && row.usable))) throw new Error(`the loopback machine is not usable: ${J(up).slice(0, 400)}`);
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const opened = await bridge(main, `window.__gmuxP95.openRemote(${J(MACHINE_ID)}, ${J(FAR)})`);
      if (opened.ok && opened.value?.result?.ok === true) break;
      await sleep(3_000);
    }
    // The machine's agent scan, which a ready machine starts by itself (`prepareMachine`).
    // THE FIX ROUND: `machines:agents` with an id answers ONE view in an array (src/main/machines/ipc.ts), which
    // this wait read as the view itself and so always waited out its 60 s.
    await waitFor(async () => {
      const v = machineAgentsViewOf(await bridge(main, `window.gmux.machines.agents(${J(MACHINE_ID)}, false)`));
      return v !== null && v.askedAt !== null && v.askedAt !== undefined ? v : null;
    }, 60_000, 500);
    const projectId = async (path, machine = 'local') => (await projectsList(main)).find((p) => p.path === path && placeOf(p) === machine)?.id ?? null;
    const ids = { matrix: await projectId(P.matrix), timing: await projectId(P.timing), ledger: await projectId(P.ledger), far: await projectId(FAR, MACHINE_ID) };
    if (Object.values(ids).some((x) => x === null)) throw new Error(`a project was not opened: ${J(ids)}`);
    farProjectId = ids.far;

    // ---- S0: start waits for exactly its Allow ---------------------------------
    let settings = null;
    let A = null;
    try {
      settings = await attachSettings(main);
      await pocket(main, 'setDoor', { on: true });
      const listening = await waitStatus(main, (s) => s.state === 'listening' && (s.confirmState === 'confirmed' || s.confirmable === true), 60_000);
      const before = listening.status;
      if (PARENT !== '' && !(listening.ok && before?.confirmState === 'confirmed')) {
        // The parent's agreement must still hold at HEAD (D2): a door that asks again is graded, not passed over.
        arm('S0', { words: WORDS_HEAD, statusRead: before !== null && before !== undefined, before: { confirmState: before?.confirmState ?? null, routesWaiting: before?.routesWaiting ?? [], routesAllowed: before?.routesAllowed ?? [] }, key: null, headOnly: null, full: null, lines: null, sessionsDelta: null, face: [], drawn: null, after: { confirmState: null, routesWaiting: [], routesAllowed: [] }, keyAfter: null, control: null, honesty: null });
        const door = await confirmDoor(main);
        if (!door.ok) throw new Error(`the door never listened: ${door.why}`);
        A = await pairPhone(main, 'p346 phone A');
        if (!A.ok) throw new Error(`phone A did not pair: ${A.why}`);
      } else if (PARENT === '') {
        // A first setup: the first Allow allows every route, start included (333.12 J39).
        const door = await confirmDoor(main);
        if (!door.ok) throw new Error(`the door never listened: ${door.why}`);
        const st = await status(main);
        report.readings.firstSetup = { routesAllowed: st?.routesAllowed ?? null, routesWaiting: st?.routesWaiting ?? null };
        A = await pairPhone(main, 'p346 phone A');
        if (!A.ok) throw new Error(`phone A did not pair: ${A.why}`);
        cannotRead('S0', 'no agreement covering the eleven was on record (no parent ran first), so start could not be seen waiting; the first Allow is printed', report.readings.firstSetup);
      } else {
        // A code may show only once main says the door is pairable (Phase 332's name check).
        await waitStatus(main, (s) => s.pairable === true || (s.pairable === undefined && s.state === 'listening'), 70_000);
        A = await pairPhone(main, 'p346 phone A');
        if (!A.ok) throw new Error(`phone A did not pair: ${A.why}`);
        // Read AFTER the pairing's own Allow, which must not allow start (333.12 D10).
        const afterPairing = (await status(main)) ?? before;
        const key = (await startKey(A)).key;
        const linesBefore = startLines().length;
        const sessionsBefore = (await sessions(main)).length;
        const ho = await headOnly(A, ids.matrix, 'claude');
        const full = await start(A, ids.matrix, 'claude', { paced: false });
        await sleep(1_000);
        const lines = startLines().length - linesBefore;
        const sessionsDelta = (await sessions(main)).length - sessionsBefore;
        const sheet = await status(main);
        const drawn = await waitFor(async () => {
          const t = await cdpEval(settings, `(() => { const b = document.querySelector('section[aria-label="Phone"] [data-phone-face-new="start"]'); return b === null ? null : b.textContent; })()`);
          return typeof t === 'string' && t.length > 0 ? t : null;
        }, 10_000, 200);
        // The confirm block's honesty sentence, composed over the PROPOSAL (`routesOffered`), read before its Allow:
        // textContent, never innerText, because the block's Details are shut (Phase 333.12.1, D14).
        // THE PROBE REVIEW (rule 9): each warning paragraph under Details ALONE. The whole block's text also holds
        // the Allow line, which says the same clause, so reading it whole passed with no clause in the sentence.
        const honesty = await cdpEval(settings, `(() => { const b = document.querySelector('section[aria-label="Phone"] [data-phone-confirm] [data-phone-confirm-details]'); return b === null ? null : [...b.querySelectorAll('p.set-config-warning')].map((p) => p.textContent); })()`);
        // Allow, pressed where a person presses it.
        await cdpEval(settings, `(() => { const b = document.querySelector('section[aria-label="Phone"] [data-phone-action="confirm-door"]'); if (b === null) return false; b.click(); return true; })()`);
        const allowed = await waitStatus(main, (s) => s.confirmState === 'confirmed' && (s.routesWaiting ?? []).length === 0 && (s.routesAllowed ?? []).includes('start'), 40_000);
        await waitStatus(main, (s) => s.state === 'listening', 40_000);
        const keyAfter = (await keyBecomes(A, (k) => k?.state === 'offered'))?.key ?? (await startKey(A)).key;
        const control = await headOnly(A, ids.matrix, 'claude');
        arm('S0', {
          words: WORDS_HEAD,
          statusRead: true,
          before: { confirmState: afterPairing.confirmState, routesWaiting: afterPairing.routesWaiting ?? [], routesAllowed: afterPairing.routesAllowed ?? [] },
          key,
          headOnly: ho,
          full: full.status,
          lines,
          sessionsDelta,
          face: (sheet?.confirmFace?.added ?? []).map((x) => ({ id: x.id, title: x.title, sentence: x.sentence })),
          drawn,
          after: { confirmState: allowed.status?.confirmState ?? null, routesWaiting: allowed.status?.routesWaiting ?? null, routesAllowed: allowed.status?.routesAllowed ?? [] },
          keyAfter,
          control,
          honesty
        });
      }
    } finally {
      settings?.close();
      settings = null;
    }

    // ---- the other phones ---------------------------------------------------------
    const B = await pairPhone(main, 'p346 phone B');
    if (!B.ok) throw new Error(`phone B did not pair: ${B.why}`);
    const C = await pairPhone(main, 'p346 phone C');
    if (!C.ok) throw new Error(`phone C did not pair: ${C.why}`);
    await keyBecomes(A, (k) => k?.state === 'offered');

    // ---- S1: the offer against main's own lists ----------------------------------
    const machineLabels = { [MACHINE_ID]: 'p346 loopback' };
    const expectNow = async () => {
      const list = await bridge(main, 'window.gmux.agentsList()');
      const scan = list.ok ? list.value : null;
      const local = (scan?.agents ?? []).filter((a) => a.installed === true && a.launchable === true && registry.ids.includes(a.id)).map((a) => a.id);
      const viewRead = await bridge(main, `window.gmux.machines.agents(${J(MACHINE_ID)}, false)`);
      const view = machineAgentsViewOf(viewRead);
      const readings = view?.agents ?? [];
      const rows = await bridge(main, 'window.gmux.machines.rows()');
      const row = rows.ok ? (rows.value?.rows ?? []).find((r) => r.id === MACHINE_ID) ?? null : null;
      // THE FIX ROUND: ready is the row usable and signed in (`ready`) AND the machine answering by the session
      // verbs' rule (the link connected or polling, the last list completed), as main's offer now reads it.
      const states = await bridge(main, 'window.gmux.machines.state()');
      const state = states.ok && Array.isArray(states.value) ? states.value.find((x) => x.id === MACHINE_ID) ?? null : null;
      const answering = state !== null && (state.link === 'connected' || state.link === 'polling') && state.feed === 'listed';
      const places = {
        local: { ready: true, read: scan !== null, agents: local },
        [MACHINE_ID]: { ready: row?.usable === true && row?.ready === true && answering, read: view !== null && view.askedAt !== null && readings.some((x) => x.presence !== 'unknown'), agents: readings.filter((x) => x.presence === 'present').map((x) => x.agentId).filter((id) => registry.ids.includes(id)) }
      };
      const projects = await projectsList(main);
      report.readings.shadowed = (scan?.agents ?? []).filter((a) => (a.shadowed ?? []).length > 0).map((a) => ({ id: a.id, shadowed: a.shadowed }));
      // THE PROBE REVIEW (rule 9): whether the two lists the expectation is made of were read at all.
      const read = { scan: scan !== null && Array.isArray(scan?.agents), machine: view !== null, machineState: state !== null };
      return { projects, read, expect: expectedOffer({ projects, machineLabels, places, rows: registry.rows.map((r) => ({ id: r.id, name: r.name, icon: r.icon })) }) };
    };
    const chosenReads = [];
    const readChosen = async () => {
      const k = (await startKey(A)).key;
      const projects = await projectsList(main);
      chosenReads.push({ got: k?.chosen ?? null, want: chosenOf(projects, await sessions(main)) });
    };
    let s1Offer = null;
    let s1Expect = null;
    let s1Read = null;
    await armSafely('S1', async () => {
      const k = (await keyBecomes(A, (x) => x?.state === 'offered')) ?? (await startKey(A));
      s1Offer = k.key ?? null;
      const e = await expectNow();
      s1Expect = e.expect;
      s1Read = e.read;
      await readChosen();
    });
    const settingsDefault = (await bridge(main, 'window.gmux.settingsGet()')).value?.defaultAgent ?? null;

    // ---- S1D's sealed half: a safeguard-off default sealed through the Settings window --
    const s1d = { sealed: { agent: 'claude', flag: null, label: null, readBack: false, got: null }, unsealed: { agent: 'codex', flag: unsealedFlag?.flag ?? null, readBackEmpty: false, got: null }, claudeArgv: null, flagTokens: [] };
    let s1dWhy = null;
    if (on('S1D')) {
      try {
        const now = (await bridge(main, 'window.gmux.settingsGet()')).value ?? null;
        s1d.unsealed.readBackEmpty = unsealedFlag !== null && !((now?.launchDefaults?.codex ?? []).includes(unsealedFlag.flag));
        const catalogs = (await bridge(main, 'window.gmux.agentFlagPresets()')).value ?? {};
        const preset = (catalogs.claude?.presets ?? []).find((p) => p.danger === true && p.verified === true) ?? null;
        if (preset === null) s1dWhy = 'Claude Code\'s catalog names no verified safeguard-off preset';
        else {
          settings = await attachSettings(main);
          const can = await cdpEval(settings, "typeof window.gmux?.settingsSet === 'function'");
          if (can !== true) s1dWhy = 'the Settings window\'s bridge has no settingsSet to drive';
          else {
            await bridge(settings, `window.gmux.settingsSet(${J({ launchDefaults: { claude: [preset.flag] } })})`);
            const back = (await bridge(main, 'window.gmux.settingsGet()')).value ?? null;
            s1d.sealed = { agent: 'claude', flag: preset.flag, label: preset.label, readBack: (back?.launchDefaults?.claude ?? []).includes(preset.flag), got: null };
            s1d.flagTokens = String(preset.flag).split(' ').filter((t) => t !== '');
            const k = await keyBecomes(A, (x) => x?.state === 'offered' && (x.agents ?? []).find((a) => a.id === 'claude')?.danger !== null, 10_000);
            const key = k?.key ?? (await startKey(A)).key;
            s1d.sealed.got = (key?.agents ?? []).find((a) => a.id === 'claude')?.danger ?? null;
            s1d.unsealed.got = (key?.agents ?? []).find((a) => a.id === 'codex')?.danger ?? null;
          }
        }
      } catch (err) {
        s1dWhy = `the Settings window could not be driven: ${String(err?.message ?? err)}`;
      } finally {
        settings?.close();
        settings = null;
      }
    }

    // ---- S2: one start per installed agent, this Mac ----------------------------------
    const cold = { ms: null };
    const s2rows = [];
    await armSafely('S2', async () => {
      const phones = [A, B];
      for (let i = 0; i < EIGHT.length; i += 1) {
        const agent = EIGHT[i];
        const Ph = phones[i % 2];
        const before = await sessions(main);
        const project = (await projectsList(main)).find((p) => p.id === ids.matrix);
        const wantName = nameFor(agent, before.filter((s) => inProject(s, project)).map((s) => s.name));
        const macBefore = await macState(main);
        const a = await start(Ph, ids.matrix, agent);
        if (cold.ms === null) cold.ms = a.ms;
        noteStarted(a, false);
        await sleep(600);
        const macAfter = await macState(main);
        const listed = a.session === null ? null : (await sessions(main)).find((s) => s.id === a.session.id) ?? null;
        const live = listed === null ? null : await waitFor(async () => ((await sessions(main)).find((s) => s.id === listed.id && ['running', 'idle', 'needs_input'].includes(s.status)) ? true : null), 30_000, 300);
        const logged = listed === null || live === null ? null : await waitFor(() => loggedFor(listed.tmuxName, false), 15_000, 250);
        const m = listed === null ? null : manifestRows([listed.id]).get(listed.id) ?? null;
        const screen = listed === null ? 0 : ((await waitFor(async () => {
          const r = await screenRead(Ph.phone, Ph.door, listed.id);
          return r.status === 200 && r.answer !== null ? r : null;
        }, 15_000, 500))?.status ?? 0);
        s2rows.push({ agent, answer: a, wantName, listed: listed === null ? null : { agent: listed.agent, projectPath: listed.projectPath, machine: listed.machine }, argv: m?.argv ?? null, binPath: join(BIN, BIN_OF[agent]), logged, cwd: m?.cwd ?? null, screen, macBefore, macAfter });
        say(`S2 ${agent}: ${String(a.status)} ${String(a.outcome)} ${a.session?.name ?? a.why} in ${a.ms.toFixed(0)} ms`);
      }
      // THE PROBE REVIEW (rule 9): the Mac's window read once more after every start has settled, so a move that
      // comes after a row's own read is seen.
      await sleep(2_000);
      const macEnd = await macState(main);
      arm('S2', { project: P.matrix, rows: s2rows, macEnd });
    });
    if (on('S1D')) {
      s1d.claudeArgv = s2rows.find((x) => x.agent === 'claude')?.argv ?? null;
      if (s1dWhy !== null) cannotRead('S1D', s1dWhy, s1d);
      else arm('S1D', s1d);
    }
    if (on('S1')) {
      await readChosen();
      if (s1Offer === null) cannotRead('S1', 'the sessions answer never carried an offer', { chosenReads });
      else arm('S1', { offer: s1Offer, expect: s1Expect, expectRead: s1Read, chosenReads, settingsDefault });
    }

    // ---- S9: no status from the phone ---------------------------------------------------
    await armSafely('S9', async () => {
      const newIds = [...started.keys()];
      let samples = 0;
      const waiting = new Set();
      for (let i = 0; i < 10; i += 1) {
        const list = await sessions(main);
        for (const id of newIds) {
          samples += 1;
          if (list.find((s) => s.id === id)?.status === 'needs_input') waiting.add(id);
        }
        await sleep(500);
      }
      arm('S9', { sessions: newIds.length, samples, waiting: [...waiting] });
    });

    // ---- S3: on the machine, and a machine away -------------------------------------------
    await armSafely('S3', async () => {
      const rows = [];
      for (const agent of ['claude', 'codex']) {
        const a = await start(A, ids.far, agent);
        noteStarted(a, true);
        const listed = a.session === null ? null : await waitFor(async () => (await sessions(main)).find((s) => s.id === a.session.id) ?? null, 20_000, 300);
        const far = listed !== null && (await waitFor(() => farPanes().has(listed.tmuxName), 20_000, 300)) === true;
        const logged = listed === null ? null : await waitFor(() => loggedFor(listed.tmuxName, true), 20_000, 300);
        const m = listed === null ? null : manifestRows([listed.id]).get(listed.id) ?? null;
        rows.push({ agent, answer: a, remote: listed?.machine?.id === MACHINE_ID, far, argv: m?.argv ?? null, binPath: join(FAR_BIN, BIN_OF[agent]), logged });
        say(`S3 ${agent}: ${String(a.status)} ${String(a.outcome)} ${a.session?.name ?? a.why} in ${a.ms.toFixed(0)} ms`);
      }
      // The machine stops answering: its sshd and every child, paused by pid.
      const paused = { count: 0, resumed: 0, notReady: false, answer: null, sessionsDelta: 0, farDelta: 0 };
      const conf = join(CONFIG_ROOT, 'p71-scratch-sshd-one.conf');
      const table = processTable();
      const listener = [...table.rows.values()].find((r) => r.command === `/usr/sbin/sshd -D -f ${conf}` || r.command.startsWith(`sshd: /usr/sbin/sshd -D -f ${conf} [listener]`)) ?? null;
      if (listener === null) return cannotRead('S3', `no process is the scratch machine's sshd (${conf}), so nothing of ours could be paused`, { rows, paused });
      const farBefore = farPanes().size;
      const sessionsBefore = (await sessions(main)).length;
      try {
        for (const pid of [listener.pid, ...descendantsOf(table.children, listener.pid)]) {
          try {
            process.kill(pid, 'SIGSTOP');
            stopped.add(pid);
            paused.count += 1;
          } catch {
            /* gone */
          }
        }
        const notReady = await waitFor(async () => {
          const k = (await startKey(A)).key;
          return (k?.places ?? []).find((p) => p.id === MACHINE_ID)?.ready === false ? true : null;
        }, 150_000, 1_000);
        paused.notReady = notReady === true;
        if (paused.notReady) paused.answer = await start(A, ids.far, 'claude');
        await sleep(1_000);
        paused.sessionsDelta = (await sessions(main)).length - sessionsBefore;
      } finally {
        paused.resumed = resumeStopped();
      }
      await sleep(2_000);
      paused.farDelta = farPanes().size - farBefore;
      // The machine back for the arms after this one.
      await bridge(main, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
      await keyBecomes(A, (k) => (k?.places ?? []).find((p) => p.id === MACHINE_ID)?.ready === true, 120_000);
      arm('S3', { words: WORDS_HEAD, project: FAR, rows, paused });
    });

    // ---- S4: the refusals ------------------------------------------------------------------
    await armSafely('S4', async () => {
      const recordsBefore = readStartRecords(ARGV_DIR).filter((r) => r.kind === 'launch').length;
      const sessionsBefore = (await sessions(main)).length;
      // A project closed between the offer and the press.
      await bridge(main, `window.__p293.addProject(${J(P.close)})`);
      const closeId = await projectId(P.close);
      await keyBecomes(A, (k) => (k?.projects ?? []).some((p) => p.id === closeId));
      await bridge(main, `window.gmux.projects.remove(${J(closeId)})`);
      const closed = await start(A, closeId, 'claude');
      const hidden = await start(A, ids.matrix, 'gemini');
      const shell = await start(A, ids.matrix, 'shell', { paced: false });
      const overlay = await start(A, ids.matrix, OVERLAY_ONLY_ID, { paced: false });
      // CodeWhale's program removed after the offer. THE FIX ROUND: its row has three names (codewhale, codew,
      // deepseek), and on 2026-10-16 the create found his real DeepSeek CLI by the third and started it. The
      // installs fence already refused any copy of the other two outside the run; this asks again, along the
      // create's own walk with the stand-in treated as gone, and removes nothing if anything would answer.
      const path = join(BIN, 'codewhale');
      const row = (installs?.rows ?? []).find((r) => r.id === 'deepseek') ?? null;
      const exposed = row === null ? 'no installs read for the row' : createPick(row.binaries, row.walk, isExec, path);
      if (exposed !== null) return cannotRead('S4', `with ${path} gone the create would run ${exposed}, so nothing was removed and nothing sent`, { closed, hidden, shell, overlay });
      const k = (await startKey(A)).key;
      const removedWasOffered = (k?.places ?? []).find((p) => p.id === 'local')?.agents?.includes('deepseek') === true;
      removedProgram = { path, text: readFileSync(path, 'utf8') };
      rmSync(path, { force: true });
      let removed;
      try {
        removed = await start(B, ids.matrix, 'deepseek');
      } finally {
        restoreProgram();
      }
      await sleep(1_000);
      const launches = readStartRecords(ARGV_DIR).filter((r) => r.kind === 'launch').length - recordsBefore;
      arm('S4', { words: WORDS_HEAD, closed, hidden, shell, overlay, removedWasOffered, removed, sessionsDelta: (await sessions(main)).length - sessionsBefore, launches });
    });

    // ---- S5: timing ---------------------------------------------------------------------------
    await armSafely('S5', async () => {
      const answers = [];
      const warm = [];
      const env = [];
      const remote = [];
      for (let i = 0; i < WARM_STARTS; i += 1) {
        const a = await start([A, B][i % 2], ids.timing, 'pi');
        noteStarted(a, false);
        answers.push(a);
        warm.push(a.ms);
      }
      // A sealed shell variable name, so each muse create asks the login shell (Phase 275).
      settings = await attachSettings(main);
      try {
        await bridge(settings, `window.gmux.settingsSet(${J({ envPassthrough: { muse: [ENV_NAME] } })})`);
      } finally {
        settings.close();
        settings = null;
      }
      const sealedEnv = ((await bridge(main, 'window.gmux.settingsGet()')).value?.envPassthrough?.muse ?? []).includes(ENV_NAME);
      let envReached = 0;
      for (let i = 0; i < ENV_STARTS; i += 1) {
        const a = await start([A, B][i % 2], ids.timing, 'muse');
        noteStarted(a, false);
        answers.push(a);
        env.push(a.ms);
        const listed = a.session === null ? null : await waitFor(async () => (await sessions(main)).find((s) => s.id === a.session.id) ?? null, 15_000, 300);
        const logged = listed === null ? null : await waitFor(() => loggedFor(listed.tmuxName, false), 15_000, 250);
        if ((logged?.env ?? []).includes(ENV_NAME)) envReached += 1;
      }
      for (let i = 0; i < REMOTE_STARTS; i += 1) {
        const a = await start([A, B][i % 2], ids.far, i % 2 === 0 ? 'claude' : 'codex');
        noteStarted(a, true);
        answers.push(a);
        remote.push(a.ms);
      }
      // THE PROBE REVIEW (rule 9): the control, S2's muse start, made before the seal: the variable must not be there.
      const museBefore = s2rows.find((x) => x.agent === 'muse')?.logged ?? null;
      const envControl = museBefore === null ? null : (museBefore.env ?? []).includes(ENV_NAME);
      const reading = { cold: cold.ms, warm, env, remote, answers: answers.map((a) => ({ status: a.status, outcome: a.outcome })), envReached, envControl, sealedEnv, spread: { warm: spreadOf(warm), env: spreadOf(env), remote: spreadOf(remote) } };
      say(`S5 create-to-answer: cold ${String(cold.ms?.toFixed(0))} ms; warm ${J(reading.spread.warm)}; shell variable ${J(reading.spread.env)}; remote ${J(reading.spread.remote)}`);
      for (const [what, xs, bound] of [['warm local', warm, WARM_P95_MS], ['remote', remote, REMOTE_P95_MS]]) {
        const p95 = quantile(xs, 0.95);
        if (p95 !== null && p95 >= bound) say(`S5 BREACH, for the main session: ${what} p95 ${p95.toFixed(0)} ms is not under ${String(bound)} ms (not retried)`);
      }
      if (cold.ms === null) return cannotRead('S5', 'no cold start was read (S2 did not run)', reading);
      arm('S5', reading);
    });

    // ---- S6: the ledger and the limits -------------------------------------------------------------
    await armSafely('S6', async () => {
      const made = async (from, test) => (await sessions(main)).filter((s) => !from.has(s.id) && test(s)).length;
      const idsNow = async () => new Set((await sessions(main)).map((s) => s.id));
      const out = { words: WORDS_HEAD };
      {
        const before = await idsNow();
        const write = freshWriteId();
        const once = nonce();
        const timestamp = String(Date.now());
        const first = await start(A, ids.ledger, 'opencode', { write, nonce: once, timestamp });
        noteStarted(first, false);
        const again = await start(A, ids.ledger, 'opencode', { write, nonce: once, timestamp, paced: false, repeat: true });
        await sleep(800);
        out.replay = { first, again: again.status, sessionsMade: await made(before, () => true) };
      }
      {
        // While it runs: a start on the machine, which takes the far round trips, and the same id re-signed.
        const before = await idsNow();
        const write = freshWriteId();
        await pace(A);
        // THE PROBE REVIEW (rule 9): the duplicate leaves only once the first request has left in full, so it
        // reaches main second; 40 ms from the first's dial alone raced its handshake.
        let firstLeft = () => undefined;
        const left = new Promise((r) => {
          firstLeft = r;
        });
        const firstP = start(A, ids.far, 'claude', { write, paced: false, onWritten: () => firstLeft() });
        await Promise.race([left, sleep(10_000)]);
        await sleep(40);
        // THE PROBE REVIEW (rule 9): not marked a repeat. A busy is counted as no act by its outcome already, and if
        // this one reached main first it IS the act, which main logs; marked a repeat it went uncounted and S7 read
        // one line too many.
        const during = await start(A, ids.far, 'claude', { write, paced: false });
        const first = await firstP;
        stampPace(A);
        noteStarted(first, true);
        // THE PROBE REVIEW (rule 9): whichever of the two reached main first made the session, so S10 ends it.
        noteStarted(during, true);
        const after = await start(A, ids.far, 'claude', { write, paced: false, repeat: true });
        await sleep(800);
        out.still = { first, during, after, sessionsMade: await made(before, () => true) };
      }
      {
        // The relay cuts the answer once main has logged the act; then the same id.
        const before = await idsNow();
        const write = freshWriteId();
        const linesBefore = startLines().length;
        let loggedBeforeCut = false;
        relay.cut(() => {
          const logged = startLines().length > linesBefore;
          if (logged) loggedBeforeCut = true;
          return logged;
        });
        let cut;
        try {
          cut = await start(A, ids.ledger, 'omp', { write, door: A.viaRelay, onWritten: () => relay.hold() });
        } finally {
          relay.pass();
        }
        await sleep(800);
        const resent = await start(A, ids.ledger, 'omp', { write, paced: false, repeat: true });
        noteStarted(resent, false);
        await sleep(800);
        out.cut = { cutStatus: cut.status, loggedBeforeCut, resent, sessionsMade: await made(before, () => true), cuts: relay.cuts(), how: relay.lastCut() };
      }
      {
        // Two phones at once: one start on the machine from A, one here from B 40 ms later.
        const before = await idsNow();
        await pace(A);
        await pace(B);
        // THE PROBE REVIEW (rule 9): B dials only once A's request has left in full.
        let aLeft = () => undefined;
        const aGone = new Promise((r) => {
          aLeft = r;
        });
        const firstP = start(A, ids.far, 'codex', { paced: false, onWritten: () => aLeft() });
        await Promise.race([aGone, sleep(10_000)]);
        await sleep(40);
        const second = await start(B, ids.ledger, 'pi', { paced: false });
        const first = await firstP;
        stampPace(A);
        stampPace(B);
        noteStarted(first, true);
        noteStarted(second, false);
        await sleep(800);
        out.two = { first, second, sessionsMade: await made(before, () => true) };
      }
      {
        // Seven from one phone, C, which has started nothing yet.
        const answers = [];
        const began = Date.now();
        for (let i = 0; i < 7; i += 1) {
          const a = await start(C, ids.ledger, 'cursor', { paced: false, ...(i === 6 ? { write: freshWriteId() } : {}) });
          noteStarted(a, false);
          answers.push(a);
        }
        const withinMs = Date.now() - began;
        // The seventh's id again once the window has passed: it was never recorded, so it acts now.
        await sleep(Math.max(0, RATE_WINDOW_MS + 1_500 - (Date.now() - began)));
        const later = await start(C, ids.ledger, 'cursor', { write: answers[6].write, paced: false });
        noteStarted(later, false);
        out.seven = { answers, withinMs, later };
      }
      arm('S6', out);
    });

    // ---- S10: every session this run started, ended and removed by main's own verbs ----------------
    {
      const startedIds = [...started.keys()];
      const listedAtEnd = await sessions(main);
      const tmuxNames = listedAtEnd.filter((x) => started.has(x.id)).map((x) => ({ name: x.tmuxName, remote: x.machine?.id === MACHINE_ID }));
      let ended = 0;
      let removed = 0;
      for (const id of startedIds) {
        const k = await bridge(main, `window.gmux.sessions.kill(${J(id)})`);
        if (k.ok) ended += 1;
      }
      await waitFor(async () => ((await sessions(main)).filter((s) => started.has(s.id) && ['running', 'idle', 'needs_input'].includes(s.status)).length === 0 ? true : null), 60_000, 500);
      for (const id of startedIds) {
        const d = await bridge(main, `window.gmux.sessions.discard(${J(id)})`);
        if (d.ok) removed += 1;
      }
      await sleep(1_500);
      const leftListed = (await sessions(main)).filter((s) => started.has(s.id)).length;
      const farNow = farPanes();
      const localNow = localPanes();
      const farLeft = tmuxNames.filter((t) => t.remote && farNow.has(t.name)).length;
      const localLeft = tmuxNames.filter((t) => !t.remote && localNow.has(t.name)).length;
      s10 = { started: startedIds.length, ended, removed, leftListed, farLeft, localLeft };
    }
  });
} catch (err) {
  // THE PROBE REVIEW (rule 9): a run that stopped left every arm after the stop unread, which is exit 2 ("could
  // not run"), never 1; an arm that already failed before the stop still makes it 1.
  unreadable += 1;
  report.error = String(err?.message ?? err);
  say(`the run stopped, so every arm after this point is UNREADABLE: ${report.error}`);
} finally {
  restoreProgram();
  const resumedAtEnd = resumeStopped();
  relay?.close();
  const leaked = watch === null ? [] : watch.stop();
  const ended = standin === null ? { ended: [], left: [] } : endStandinProcesses(standin.dir, 1_500);
  if (dns !== null) await dns.close();
  // Every agent stand-in, by the pids their own records and hellos wrote.
  // THE PROBE REVIEW (rule 9): a recorded pid is signalled ONLY while the process wearing it is still one of this
  // run's stand-ins by its command line (the run's folder, or a stand-in script's own path). By this point S10 has
  // ended almost every session, so almost every recorded pid is gone, and on a busy Mac a pid is handed out again
  // within minutes: before the review the `finally` sent SIGTERM and SIGKILL to whatever held it now.
  const STANDIN_SCRIPTS = [join(ROOT, 'build', 'p346', 'argv-stand-in.mjs'), join(ROOT, 'build', 'p318', 'stand-in.mjs')];
  const ourIn = (table) => (pid) => {
    const command = table.rows.get(pid)?.command ?? '';
    return command.includes(RUN) || STANDIN_SCRIPTS.some((s) => command.includes(s));
  };
  const agentPids = [
    ...new Set([
      ...hellos(STANDIN_DIR).flatMap((h) => [Number(h.pid), Number(h.runnerPid)]),
      ...readStartRecords(ARGV_DIR).filter((r) => r.kind === 'launch').map((r) => Number(r.pid))
    ])
  ]
    .filter((p) => Number.isInteger(p) && p > 1 && p !== process.pid)
    .filter(ourIn(processTable()));
  const alive = (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  for (const pid of agentPids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* gone with its pane */
    }
  }
  for (let i = 0; i < 20 && agentPids.some(alive); i += 1) await sleep(100);
  {
    const stillOurs = ourIn(processTable());
    for (const pid of agentPids.filter((p) => alive(p) && stillOurs(p))) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* gone */
      }
    }
  }
  await sleep(200);
  const agentsLeft = (() => {
    const stillOurs = ourIn(processTable());
    return agentPids.filter((p) => alive(p) && stillOurs(p)).length;
  })();
  if (s10 !== null && on('S10')) arm('S10', s10);
  else if (on('S10')) cannotRead('S10', 'the HEAD launch did not reach its ends');
  // S7, after the app has gone: the log and every file the run kept.
  if (on('S7') && sentWrites.size > 0) {
    const text = appLogText();
    const lines = startLines();
    const projectIds = [...new Set(report.answers.map((a) => a.project))].filter((x) => typeof x === 'string' && x.length >= 8);
    const paths = [...Object.values(P), FAR, RUN];
    const agentWords = [...new Set([...EIGHT, 'gemini', 'shell', OVERLAY_ONLY_ID])];
    const sentences = Object.values(WORDS_HEAD).filter((v) => typeof v === 'string' && v.length > 12);
    const argWords = [...(registry?.danger?.claude ?? []).map((d) => d.flag), ...(unsealedFlag === null ? [] : [unsealedFlag.flag])];
    const lineHits = [];
    lines.forEach((line, i) => {
      const names = [
        ...projectIds.filter((x) => line.includes(x)).map(() => 'a project id'),
        ...paths.filter((x) => line.includes(x)).map(() => 'a path'),
        ...agentWords.filter((x) => new RegExp(`(^|[^A-Za-z0-9-])${x.replace(/[-]/g, '\\-')}([^A-Za-z0-9-]|$)`).test(line.slice(line.indexOf(START_LINE) + START_LINE.length))).map((x) => `the agent ${x}`),
        ...argWords.filter((x) => line.includes(x)).map(() => 'an argument'),
        ...[...sentWrites].filter((x) => line.includes(x)).map(() => 'a write id'),
        ...sentences.filter((x) => line.includes(x)).map(() => 'a sentence')
      ];
      if (names.length > 0) lineHits.push({ line: i, names });
    });
    const writeIdHits = [];
    let filesScanned = 0;
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
          let s;
          try {
            s = readFileSync(p).toString('latin1');
          } catch {
            continue;
          }
          for (const w of sentWrites) if (s.includes(w)) writeIdHits.push({ file: p.slice(HARNESS_DIR.length + 1) });
        }
      }
    };
    walk(HARNESS_DIR);
    arm('S7', { appLogRead: text !== null, lines: lines.length, acted, unknown: actedUnknown, lineHits, filesScanned, writeIdHits });
  } else if (on('S7')) cannotRead('S7', 'no start was sent');
  // Anything of this run still in the process table: a command naming the run's folder.
  const runLeft = processRows().filter((r) => r.pid !== process.pid && (r.command.includes(RUN) || r.command.includes(join(ROOT, 'build', 'p346', 'argv-stand-in.mjs')))).length;
  arm('RUN', {
    tailscalePreflight,
    dnsPreflights,
    agentsHeld,
    resolved: resolvedOk,
    hiddenUnresolved,
    installs: installsOk === true,
    manifest: manifestArgvOutside(),
    realTailscale: leaked.length,
    samples: watch?.samples() ?? 0,
    forbidden: standin === null ? 0 : standin.forbidden().length,
    standinLeft: ended.left.length,
    agentsLeft,
    runLeft,
    history: { before: HISTORY_BEFORE, after: historyStat() },
    resumedAtEnd
  });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `probe-p346${PARENT === '' ? '' : '-with-parent'}.json`), `${J(report, (_k, v) => (typeof v === 'bigint' ? String(v) : v), 2)}\n`, { mode: 0o600 });
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
  else say(`kept ${RUN} (P346_KEEP=1): every stand-in's record under ${ARGV_DIR}; every answer in ${OUT}`);
}

say(`${String(report.arms.filter((a) => a.ok === true).length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
process.exit(failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
