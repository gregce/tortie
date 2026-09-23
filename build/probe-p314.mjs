#!/usr/bin/env node
/**
 * probe:p314 — the push, driven inside the real app BY REAL AGENTS (Phase 314).
 *
 * WHY IT EXISTS. `conformance:push` drives the shipping sender, composer and
 * engine under plain node with an injected clock. What it cannot drive is the
 * chain INSIDE THE APP: the blocked feed off the real core's broadcast, the
 * door's own `/v1/blocked` rows over real sessions whose status the shipped
 * activity monitor decided, the SHIPPING pairing path putting a device token
 * into the sealed pocket store, the sealed APNs key store over the real
 * `safeStorage` (mock keychain), the confirm record, and the engine's timers on
 * the real clocks. This probe is that run, once, with every constant the
 * shipping one.
 *
 * WHY REAL AGENTS (the operator's ruling, 2026-09-22: "should we just use a
 * real agent? … so we can fix this correctly"). The first build of this probe
 * ran a /bin/sh `claude` that printed a committed dialog in ONE BURST after a
 * long silence. That shape is missed by the activity monitor about 1 time in
 * 5 (171 of 800 simulated timings, `#{window_activity}` being whole seconds
 * against `QUIET_MS`), and the probe graded each miss as a push failure: two
 * runs, two different red arms, neither of them the push. That race is a
 * limit of the monitor the push, the tray and ⌘J share, and it is Phase 319's.
 * This probe does not work around it and does not touch `src/main/activity/`.
 * It drives blocks the monitor sees for a stated reason, and it grades EVERY
 * arm in two steps:
 *
 *   1. did the session really block? read from MAIN (`sessions:list`, and the
 *      door's own rows through the seam's `blocked` command), never from the
 *      renderer's store. When it did not, the arm reads UNREADABLE, names the
 *      agent and the reason, and is never a push failure;
 *   2. only then is the push judged.
 *
 * A run with any unreadable arm exits 2 and is NOT green.
 *
 * THE TWO REAL SHAPES, cheapest first.
 *
 *   GEMINI'S TRUST QUESTION. The real Gemini CLI, under the SCRATCH home: no
 *   account, no sign-in, no model turn. In a folder it has never seen it asks
 *   `Do you trust the files in this folder?` as a numbered choice before
 *   anything else (the committed `gemini-trust-gate.txt` is that screen, and
 *   the dialog detector reads it). The scratch home's own settings turn its
 *   self-updater and its usage statistics off, and an `npm` on the scratch
 *   PATH refuses, so it installs nothing and reports nothing. The block is
 *   cleared by ending the session, so the question is never answered.
 *
 *   WHY A QUESTION AT LAUNCH IS SEEN AT ONCE, with the state machine's rule.
 *   A new session's activity state is `starting` (`freshState`), and
 *   `worthProbing` answers true for a `starting` session whatever its output
 *   timestamp says, and for sixty seconds after `lastWorkingAt` besides. A
 *   worth-probing session with no native answer is AMBIGUOUS, and an ambiguous
 *   session is CAPTURED on every tick, within the capture budget. Two
 *   consecutive captures holding the dialog (`DIALOG_CONFIRM_TICKS`) make it
 *   `needs_input`. None of that asks `#{window_activity}`, so the one second
 *   race that misses a burst after a long silence cannot miss this.
 *
 *   CLAUDE CODE'S PERMISSION REQUEST. The real Claude Code under the person's
 *   OWN sign-in, the way `conformance:resume` runs it, through a short
 *   wrapper that restores his HOME and adds no flag: the shipped recipe decides
 *   every one. In a new scratch folder it first asks whether to trust the
 *   folder. In the Claude Code on this Mac (2.1.280) that question draws NO
 *   numerals and focuses "No, exit" (`hideIndexes`, `cancelFirst`), so the
 *   screen tier cannot see it (a reading for Phase 319, recorded as
 *   `claudeTrust`) and a bare Enter would end the session: the probe moves to
 *   "Yes, I trust this folder" and presses Enter only once it reads that
 *   option focused. His own Claude Code then starts in a mode that does not
 *   ask (its footer reads "don't ask on"), so the probe presses Shift+Tab, his
 *   own keystroke for the session's mode, until the footer reads "manual mode
 *   on": the safeguard turned ON for this one session, with no flag and no
 *   settings file touched. And his own allow rules let it create a file in the
 *   working folder without asking in either mode (measured: run 1 of this
 *   round, and a preflight in manual mode, both wrote the file with no request
 *   at all), so the file is asked for inside the scratch project's `.claude/`
 *   folder, a protected path Claude Code asks about whatever the allow rules
 *   say. Then ONE short turn asks it to create that file there, and it raises
 *   a real permission request, which Claude Code reports through its HOOK
 *   (`PermissionRequest`, registry tier native, hooks `claude-settings`) — the
 *   path most of his sessions take. That is P2. Escape refuses the write
 *   (the clear), a second short turn asks again (the re-block, P3), and Escape
 *   refuses it again, so no file is ever written. THE WHOLE RUN SPENDS
 *   EXACTLY TWO MODEL TURNS, and the report counts them. Two, because one
 *   session must block, clear and block again, and the only question this
 *   Claude Code draws that the monitor sees is the permission request.
 *
 *   The app itself is NOT a child of whoever ran the probe: every Claude Code
 *   session variable the probe inherited (a probe run from a Claude Code
 *   session carries that session's id, its messaging socket and token, and the
 *   child-session marker) is removed from the app's environment, and so from
 *   every pane, because his Tortie started from the Dock has none and his
 *   login shell sets none. The names are reported, never the values.
 *
 *   Two things about that session are deliberate and named. Claude Code
 *   writes a pid file into his home that Tortie reads by PANE ID ALONE, and a
 *   scratch tmux server's pane ids are small numbers his own server may also
 *   hold; so the wrapper hides the scratch server from claude (`TMUX` and
 *   `TMUX_PANE` unset), the file names no pane, and neither his running Tortie
 *   nor this one can read it as one of theirs. And its self-updater is off for
 *   the run (`DISABLE_AUTOUPDATER=1`), so nothing is installed. What it leaves
 *   in his home is what `conformance:resume` leaves: the one turn's transcript
 *   and prompt history in Claude Code's own store, and the scratch folder's
 *   trust answer. This probe never reads either.
 *
 * ONE HELD REVEAL, and why. "Many at once" means the rows join inside one
 * coalescing window (`COALESCE_MS`), and a real agent's start takes a few
 * seconds that vary. So the six sessions of P4 and the three of P5 are each
 * put into tmux copy-mode the moment they exist — Tortie's own scroll
 * primitive, which the monitor deliberately holds (a pane a person has
 * scrolled back is never judged) — and released together, in one tmux
 * command, once every one of them has drawn its question. The monitor then
 * sees them on the same ticks. The door's own stamps are read back and the arm
 * is unreadable if they spread past `COALESCE_MS`. It never exceeds the
 * monitor's capture budget (`MAX_CAPTURES_PER_TICK`, read from its source):
 * that budget is older than this phase and twenty at once stays
 * `conformance:push` E3's.
 *
 * WHAT IS SUPPLIED, and it is exactly three things:
 *   - the two wrappers on the scratch PATH, and the `npm` that refuses;
 *   - the APNs provider key is a scratch P-256 key GENERATED HERE with
 *     `node:crypto`, written 0600 under the harness directory for the seam, and
 *     deleted in the `finally` whatever happened. There is no real key;
 *   - Apple is `build/p314/apns-stand-in.mjs`, two h2c listeners on
 *     `127.0.0.1` IN THIS PROCESS (not a child), closed in the `finally`. THE
 *     SENDER IS NEVER AIMED AT ANYTHING ELSE: the seam refuses a seed whose
 *     origins are not `http://127.0.0.1:<port>`, and there is no real push.
 *
 * THE SLEEP IS DRIVEN, NEVER TAKEN. The machine does not sleep, so its poll
 * keeps running. "Blocked during the sleep" is driven as what the Mac actually
 * does on a real wake: the rows are FIRST SEEN after the resume. The three
 * sessions are started and held BEFORE the suspend, the probe sends `suspend`,
 * then `resume` with the engine's clock set eight hours on, and only then
 * releases them.
 *
 * THE ARMS, in this order, one app run. Every session an arm starts is ended
 * when the arm is done, and the probe then waits until the stand-in has been
 * QUIET for the floor plus a margin, so every request is attributed to the arm
 * that caused it:
 *   P0  seed: key kept, phones A and B paired, alerts on, confirmed; 0 requests
 *   P1  inert: push-off; a trust question blocks; 0 requests; push-on; not a join
 *   P2  single: Claude Code's real permission request, through the hook; A
 *       and B each get the single shape
 *   P3  re-block: the write refused (a badge-only 0), a second turn and a
 *       second permission request: the same card, the same collapse id; the
 *       turns' working and the idle after the refusal raise nothing
 *   P4  at once: MAX_CAPTURES_PER_TICK trust questions released together, one
 *       count alert per phone
 *   P4b the coalesced window: after an alert, two more rows join at different
 *       moments inside the floor; ONE count alert carries both
 *   P5  THE WAKE: suspend; resume + clock +8h; three held questions released;
 *       one alert per phone that says so, and the door says so too
 *   P6  clock back two hours; A answers ExpiredProviderToken once
 *   P7  the key broken by a planted plaintext record; nothing sent, one sentence
 *   P8  B answers 410; dropped, and never asked again
 *   P9  A removed; nothing to anyone, before and after a confirm
 *   P10 app.log afterwards holds no token, no JWT, no PEM line, no payload
 *   and at the end: no Electron and no agent process of this run left.
 *
 * NOT DRIVEN HERE, and why. A REMOTE row forced to `needs_input` needs a second
 * machine, and `remoteRowStatus` never produces that status, so no real agent
 * can put one in front of the engine; `conformance:push` E2 drives it. A row
 * already blocked when Tortie starts, a row joining and leaving inside the
 * window, and every refusal of the sender are the gate's too.
 *
 * WHAT IT WRITES. `out/p314/probe-p314.json`: per arm a verdict and a sentence,
 * with digests, lengths, statuses and the probe's own synthetic names — NEVER a
 * device token, a provider token, a key byte, a payload, a line of any agent's
 * screen or of the one turn. For the verifier's independent re-derivation (SPEC
 * §4.2) it also writes, INSIDE THE SCRATCH RUN DIRECTORY and only when
 * `P314_KEEP=1`, `rederive/records.json`: every request the stand-in took with
 * its body and bearer, the door rows the seam printed, the probe's own clock
 * readings, and the scratch PUBLIC key. Every token and key in it is this run's
 * synthetic one. The private key file is deleted in the `finally` even when the
 * run directory is kept.
 *
 * WHAT IT REFUSES TO DO. It signals nothing it did not start: the launch goes
 * through `build/electron-run.mjs`'s `withElectron`, whose kill is in a
 * `finally`, and it names its own scratch tmux socket (`gmux-p314-<pid>`,
 * never `gmux`) so the same teardown ends that server and every agent in it.
 * Every tmux command it runs itself names that socket. Every agent process it
 * saw under that server is recorded with its command line. A real Gemini CLI
 * outlives the hang-up tmux sends when its session ends (measured: both of
 * its processes survived a kill-server and ended on the first TERM), so when
 * an arm ends its sessions, any recorded process no longer under a live pane
 * and still carrying the same command line is ended by pid, TERM then KILL;
 * the `finally` does the same after the teardown for whatever is left. It
 * never runs `pkill`, installs nothing, spends two model turns, passes no flag
 * to any agent, reads no credential, keychain item or conversation store, and
 * writes nothing under the person's home itself. `npm run shot` is not called.
 *
 * VERIFIERS ONLY. It starts an Electron: take the orchestrator's Electron lock
 * first. Builders write it and never run it.
 *
 * BUILD FIRST. It carries no `npm run build &&` on purpose, because a run
 * against another checkout must not rebuild this one, and it refuses (exit 2)
 * when the checkout it is pointed at has no build.
 *
 *   npm run -s probe:p314
 *   P314_PARENT_CHECKOUT=/path/to/parent npm run -s probe:p314   the parent reading
 *   P314_KEEP=1 npm run -s probe:p314                            keep the scratch world
 *
 * Exit 0 when every arm passed (or, at the parent, every arm read unreadable
 * because the build predates the seam), 1 when an arm failed, 2 when it could
 * not run or, at this build, an arm could not be READ, which is never a pass.
 */

import { spawnSync } from 'node:child_process';
import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from './electron-run.mjs';
import { wsConnect, cdpEval } from './cdp-client.mjs';
import { pickRendererTarget } from './cdp-target.mjs';
import { startApnsStandIn } from './p314/apns-stand-in.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** The checkout whose APP is launched. The helper and the stand-in are always this tree's. */
const CHECKOUT = resolve((process.env['P314_PARENT_CHECKOUT'] ?? '').trim() || ROOT);
const AT_PARENT = CHECKOUT !== ROOT;
const TAG = `[p314 ${AT_PARENT ? 'parent' : 'head'}]`;
const say = (line) => console.log(`${TAG} ${line}`);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const J = JSON.stringify;
const sha = (text) => createHash('sha256').update(text).digest('hex');

if (!existsSync(join(CHECKOUT, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} ${CHECKOUT} has no build at out/main/index.js. Run npm run build there first.`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// The constants of the SHIPPING engine and monitor, read out of the source
// rather than copied, so the waits below cannot drift from what the app does.
// ---------------------------------------------------------------------------

function constantOf(file, name) {
  const path = join(CHECKOUT, file);
  if (!existsSync(path)) return null;
  const hit = new RegExp(`${name}\\s*=\\s*([0-9_]+)`).exec(readFileSync(path, 'utf8'));
  return hit === null ? null : Number(hit[1].replace(/_/g, ''));
}
const FLOOR_MS = constantOf('src/main/push/engine.ts', 'ALERT_FLOOR_MS') ?? 30_000;
const COALESCE_MS = constantOf('src/main/push/engine.ts', 'COALESCE_MS') ?? 4_000;
const WAKE_MS = constantOf('src/main/tray/attention.ts', 'WAKE_WINDOW_MS') ?? 15_000;
/** The status monitor's screen captures per tick: the most dialogs it confirms together. */
const CAPTURES = constantOf('src/main/activity/monitor.ts', 'MAX_CAPTURES_PER_TICK') ?? 6;
/** Quiet this long between arms: the floor plus a margin. */
const QUIET_MS = FLOOR_MS + 6_000;

// ---------------------------------------------------------------------------
// The scratch world. Outside the repository and outside the person's home,
// which is what build/electron-run.mjs refuses a profile for.
// ---------------------------------------------------------------------------

const RUN = resolve((process.env['P314_RUN'] ?? '').trim() || `/private/tmp/p314-probe-${String(process.pid)}`);
const HOME = join(RUN, 'home');
const HARNESS = join(RUN, 'harness');
const PROFILE = join(HARNESS, 'profile');
const PUSH_DIR = join(HARNESS, 'push');
const KEY_FILE = join(PUSH_DIR, 'scratch-key.p8');
const COMMANDS = join(PUSH_DIR, 'commands.json');
const PROJECT = join(RUN, 'project');
const BIN = join(HOME, '.local', 'bin');
const SOCKET = `gmux-p314-${String(process.pid)}`;
const KEEP = (process.env['P314_KEEP'] ?? '') === '1';

const TOPIC = 'software.itavero.tortie.p314';
const KEY_ID = 'P314PROBE1';
const TEAM_ID = 'P314TEAM01';
const tokenA = randomBytes(32).toString('hex');
const tokenB = randomBytes(32).toString('hex');
const EIGHT_HOURS = 8 * 3_600_000;
const TWO_HOURS = 2 * 3_600_000;

/** The drawn names of the two agents, as the registry spells them. */
const AGENT_LABEL = { claude: 'Claude Code', gemini: 'Gemini CLI' };
/** Gemini's first-run question, as the committed fixture holds it. */
const GEMINI_TRUST = /Do you trust the files in this folder\?/;
/** Claude Code's folder trust question, and its Yes option focused (with or without a numeral). */
const CLAUDE_TRUST = /Yes, I trust this folder/;
const CLAUDE_TRUST_YES_FOCUSED = /^\s*[❯›>]\s*(?:\d[.)]\s*)?Yes, I trust this folder/m;
/** Claude Code's permission mode, as its footer names it, and the one that asks. */
const CLAUDE_MODE = /[⏵⏸]+\s*([a-z' ]+?) (?:mode )?on\b/;
const CLAUDE_ASKS_MODE = /manual mode on/;
/** Claude Code asking before it writes. */
const CLAUDE_ASKS = /Do you want to (?:create|make|proceed|write)/;
/**
 * The run's TWO model turns. The file is asked for inside the scratch
 * project's `.claude/` folder, a PROTECTED path Claude Code asks about even
 * where edits are allowed, because the person's own allow rules let it create
 * a file in the working folder without asking (measured). Each write is
 * refused, so the file is never written.
 */
const CLAUDE_TURN = 'Create a file named .claude/p314.txt in this folder containing the single word hello. Do nothing else.';
const CLAUDE_TURN_AGAIN = 'Try again: create the file .claude/p314.txt in this folder containing the single word hello.';
const CLAUDE_FILE = join(PROJECT, '.claude', 'p314.txt');

const report = {
  checkout: CHECKOUT,
  atParent: AT_PARENT,
  constants: { FLOOR_MS, COALESCE_MS, WAKE_MS, QUIET_MS, CAPTURES },
  agents: {},
  turns: 0,
  arms: [],
  readings: {}
};
let failures = 0;
const arm = (id, ok, said) => {
  report.arms.push({ id, ok, said });
  if (ok === false) failures += 1;
  say(`${ok === null ? 'UNREADABLE' : ok ? 'PASS' : 'FAIL'} ${id}: ${said}`);
};

/** A request, as the report may carry it: digests, lengths and headers, never a token or a body. */
function redacted(rec) {
  return {
    seq: rec.seq,
    at: rec.at,
    origin: rec.origin,
    phone: rec.token === tokenA ? 'A' : rec.token === tokenB ? 'B' : 'other',
    status: rec.status,
    reason: rec.reason,
    headers: rec.headers,
    bodyBytes: rec.bodyBytes,
    bodySha256: sha(rec.body),
    authorizationSha256: rec.authorizationDigest,
    iat: rec.jwt?.claims?.iat ?? null,
    verifies: rec.jwt?.verifies ?? false
  };
}

// ---------------------------------------------------------------------------
// The scratch tmux server: every command this probe runs names ITS socket.
// ---------------------------------------------------------------------------

function tmuxRun(args) {
  return spawnSync('tmux', ['-L', SOCKET, ...args], { encoding: 'utf8', timeout: 15_000 });
}

/** The pane of one of this run's sessions, by its tmux name. */
function paneOf(tmuxName) {
  const r = tmuxRun(['list-panes', '-a', '-F', '#{session_name}\t#{pane_id}\t#{pane_pid}']);
  if (r.status !== 0) return null;
  for (const line of (r.stdout ?? '').split('\n')) {
    const [name, paneId, pid] = line.split('\t');
    if (name === tmuxName && paneId !== undefined) return { paneId, panePid: Number(pid) };
  }
  return null;
}

/** What a pane shows, for the probe's own control flow. Never written to the report. */
function screenOf(paneId) {
  if (paneId === null) return '';
  const r = tmuxRun(['capture-pane', '-p', '-J', '-t', paneId]);
  return r.status === 0 ? (r.stdout ?? '') : '';
}

/**
 * Every agent process this run saw under its own server, with its command line
 * at the time. The `finally` ends only a pid whose command line is STILL that
 * one, so a reused pid is never touched.
 */
const agentProcs = new Map();
function noteAgentProcs() {
  const panes = tmuxRun(['list-panes', '-a', '-F', '#{pane_pid}']);
  if (panes.status !== 0) return;
  const roots = (panes.stdout ?? '').split('\n').map(Number).filter((n) => Number.isInteger(n) && n > 1);
  const ps = spawnSync('ps', ['-Ao', 'pid=,ppid=,command='], { encoding: 'utf8' });
  const rows = [];
  for (const line of (ps.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m !== null) rows.push({ pid: Number(m[1]), ppid: Number(m[2]), cmd: m[3] });
  }
  const byPid = new Map(rows.map((r) => [r.pid, r]));
  const kids = new Map();
  for (const r of rows) {
    if (!kids.has(r.ppid)) kids.set(r.ppid, []);
    kids.get(r.ppid).push(r.pid);
  }
  const stack = [...roots];
  const seen = new Set();
  while (stack.length > 0) {
    const pid = stack.pop();
    if (seen.has(pid)) continue;
    seen.add(pid);
    const row = byPid.get(pid);
    if (row !== undefined && !agentProcs.has(pid)) agentProcs.set(pid, row.cmd);
    for (const k of kids.get(pid) ?? []) stack.push(k);
  }
}
const commandOf = (pid) => (spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();

// ---------------------------------------------------------------------------
// The real agents, resolved from the person's own login shell.
// ---------------------------------------------------------------------------

class Unreadable extends Error {}

const REAL_HOME = (process.env['HOME'] ?? '').trim();
/**
 * The Claude Code session variables this probe INHERITED (a probe run from a
 * Claude Code session carries that session's id, its messaging socket and the
 * token for it, and the child-session marker). Mapped to `undefined`, which is
 * what removes a key from the app's environment. Names only are reported.
 */
const INHERITED_CLAUDE = Object.fromEntries(
  Object.keys(process.env)
    .filter((name) => /^(?:CLAUDECODE|CLAUDE_)/.test(name))
    .map((name) => [name, undefined])
);
function loginWhich(name) {
  const r = spawnSync('/bin/zsh', ['-lc', `command -v ${name}`], { encoding: 'utf8', timeout: 30_000 });
  const path = (r.stdout ?? '').trim().split('\n').pop() ?? '';
  return isAbsolute(path) && existsSync(path) && !path.includes("'") ? path : null;
}
const agents = {
  claude: { path: null, why: '' },
  gemini: { path: null, why: '' }
};

let standIn = null;
const probeClock = [];
let ran = false;
let appText = '';
/** The pids this run's launch started: the shim, and the app it forwards to. */
let shimPid = 0;
let appPid = 0;
/** Session name to id, the probe's own synthetic sessions. */
const sessionIds = {};

try {
  // ---- the world ----------------------------------------------------------
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, HARNESS, PROFILE, PUSH_DIR, PROJECT, BIN, join(HOME, '.claude'), join(HOME, '.gemini')]) {
    mkdirSync(dir, { recursive: true });
  }

  // The real binaries, from the person's own login shell.
  if (REAL_HOME === '' || !isAbsolute(REAL_HOME) || REAL_HOME.startsWith('/private/tmp') || REAL_HOME.startsWith('/tmp') || REAL_HOME.includes("'")) {
    agents.claude.why = 'this probe is not running under a login home, so Claude Code has no sign-in to use';
  } else {
    agents.claude.path = loginWhich('claude');
    if (agents.claude.path === null) agents.claude.why = 'claude is not on the login shell PATH';
  }
  agents.gemini.path = loginWhich('gemini');
  if (agents.gemini.path === null) agents.gemini.why = 'gemini is not on the login shell PATH';
  report.strippedFromApp = Object.keys(INHERITED_CLAUDE).sort();
  report.agents = {
    claude: agents.claude.path === null ? `absent: ${agents.claude.why}` : 'real, under the person’s own sign-in',
    gemini: agents.gemini.path === null ? `absent: ${agents.gemini.why}` : 'real, under the scratch home, no account'
  };

  // The wrappers. Each adds NO flag: Tortie's shipped recipe decides every one.
  if (agents.claude.path !== null) {
    writeFileSync(
      join(BIN, 'claude'),
      [
        '#!/bin/sh',
        '# probe:p314. The REAL Claude Code under the person\'s own sign-in. It adds no flag.',
        '# It restores HOME, turns the self-updater off for the run, and hides this scratch',
        '# tmux server so the pid file claude writes into that home names no pane.',
        'unset TMUX TMUX_PANE',
        `HOME='${REAL_HOME}'; export HOME`,
        'DISABLE_AUTOUPDATER=1; export DISABLE_AUTOUPDATER',
        `exec '${agents.claude.path}' "$@"`,
        ''
      ].join('\n'),
      'utf8'
    );
    chmodSync(join(BIN, 'claude'), 0o755);
  }
  if (agents.gemini.path !== null) {
    writeFileSync(
      join(BIN, 'gemini'),
      [
        '#!/bin/sh',
        '# probe:p314. The REAL Gemini CLI under the SCRATCH home: no account, no turn.',
        `HOME='${HOME}'; export HOME`,
        `exec '${agents.gemini.path}' "$@"`,
        ''
      ].join('\n'),
      'utf8'
    );
    chmodSync(join(BIN, 'gemini'), 0o755);
  }
  // Nothing is installed during this run, whatever an agent's updater wants.
  writeFileSync(join(BIN, 'npm'), '#!/bin/sh\necho "probe:p314 refuses npm: nothing is installed during this run" >&2\nexit 1\n', 'utf8');
  chmodSync(join(BIN, 'npm'), 0o755);
  // Gemini's own settings in the scratch home: no self-update, no statistics,
  // and the folder trust it asks by default, said out loud.
  writeFileSync(
    join(HOME, '.gemini', 'settings.json'),
    `${J({
      general: { enableAutoUpdate: false, enableAutoUpdateNotification: false },
      privacy: { usageStatisticsEnabled: false },
      security: { folderTrust: { enabled: true } }
    }, null, 2)}\n`,
    'utf8'
  );
  // tmux's execvp reads the LOGIN shell's PATH, so the scratch bin goes on it.
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  const git = (args) => spawnSync('git', args, { cwd: PROJECT, encoding: 'utf8', env: { ...process.env, HOME } });
  git(['init', '-q']);
  writeFileSync(join(PROJECT, 'note.txt'), 'hello\n');
  git(['add', '-A']);
  git(['-c', 'user.email=p@x', '-c', 'user.name=p', 'commit', '-qm', 'seed']);

  // ---- the scratch key, generated here and deleted in the finally ---------
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pem = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicPem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  writeFileSync(KEY_FILE, pem, { mode: 0o600 });
  const pemLines = pem.split('\n').filter((l) => l.length >= 16 && !l.startsWith('-----'));

  // ---- the stand-in, in this process --------------------------------------
  standIn = await startApnsStandIn({
    publicKey: pair.publicKey,
    topic: TOPIC,
    devices: { [tokenA]: 'development', [tokenB]: 'development' }
  });
  say(`stand-in on ${standIn.origins.development} and ${standIn.origins.production}`);
  writeFileSync(
    join(PUSH_DIR, 'seed.json'),
    J({
      key: { keyId: KEY_ID, teamId: TEAM_ID, topic: TOPIC, p8File: KEY_FILE },
      phones: [
        { label: 'A', token: tokenA, environment: 'development' },
        { label: 'B', token: tokenB, environment: 'development' }
      ],
      origins: standIn.origins,
      alerts: true
    }),
    { mode: 0o600 }
  );

  // ---- the readings -------------------------------------------------------
  const requests = () => standIn.requests;
  const toPhone = (reqs, token) => reqs.filter((r) => r.token === token);
  const bodyOf = (rec) => {
    try {
      return JSON.parse(rec.body);
    } catch {
      return null;
    }
  };
  const lastAt = () => {
    const all = requests();
    return all.length === 0 ? 0 : all[all.length - 1].at;
  };

  async function waitRequests(from, n, ms) {
    const started = Date.now();
    while (requests().length - from < n && Date.now() - started < ms) await sleep(250);
    return requests().slice(from);
  }

  /** Wait until the stand-in has been quiet for `quiet` ms, at most `max`. */
  async function waitQuiet(quiet, max = 180_000) {
    const started = Date.now();
    for (;;) {
      const since = Date.now() - Math.max(lastAt(), started);
      if (since >= quiet) return true;
      if (Date.now() - started > max) return false;
      await sleep(500);
    }
  }

  /** Attach to the app's own window, by the shared pick rather than by guess. */
  async function attach(timeoutMs) {
    const started = Date.now();
    let why = 'no DevToolsActivePort yet';
    for (;;) {
      try {
        const port = Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
        if (Number.isFinite(port) && port > 0) {
          const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
          const picked = pickRendererTarget(list);
          if (picked.target !== null) {
            const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
            say(`attached on port ${String(port)}`);
            return cdp;
          }
          why = picked.why;
        }
      } catch (err) {
        why = String(err?.message ?? err);
      }
      if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
      await sleep(300);
    }
  }

  async function body(handle) {
    const seamSeen = handle
      .waitForLine(/\[gmux-push-seam\] installed [^\n]*\n/, 150_000)
      .then(() => true)
      .catch(() => false);
    const cdp = await attach(150_000);
    await cdp.call('Runtime.enable');
    for (let i = 0; i < 200; i += 1) {
      const armed = await cdpEval(cdp, 'window.__gmuxP93 !== undefined && window.__gmuxP202 !== undefined && window.gmux !== undefined');
      if (armed === true) break;
      await sleep(300);
    }

    // ---- P0: the seed ---------------------------------------------------
    if (!(await seamSeen)) {
      if (AT_PARENT) {
        for (const id of ['P0', 'P1', 'P2', 'P3', 'P4', 'P4b', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10']) {
          arm(id, null, 'unreadable, the build predates the seam');
        }
      } else {
        arm('P0 seed', false, `the seam never printed its installed line; the app said: ${handle.text().split('\n').filter((l) => l.includes('push-seam')).slice(-5).join(' / ') || 'nothing about the seam'}`);
      }
      cdp.close();
      return;
    }
    const installed = /\[gmux-push-seam\] installed ([^\n]*)/.exec(handle.text())?.[1] ?? '';
    report.readings.installed = installed;
    arm(
      'P0 seed',
      installed === 'phones=2 key=present alerts=on confirm=confirmed' && requests().length === 0,
      `the seam said ${J(installed)}; the stand-in holds ${String(requests().length)} request(s)`
    );

    let seq = 0;
    async function command(commands) {
      seq += 1;
      const mine = seq;
      writeFileSync(COMMANDS, J({ seq: mine, commands }));
      await handle.waitForLine(new RegExp(`\\[gmux-push-seam\\] applied seq=${String(mine)} `), 30_000);
    }
    const lastSeamLine = (kind) => {
      const lines = handle.text().split('\n').filter((l) => l.startsWith(`[gmux-push-seam] ${kind} `));
      const line = lines[lines.length - 1];
      if (line === undefined) return null;
      try {
        return JSON.parse(line.slice(`[gmux-push-seam] ${kind} `.length));
      } catch {
        return null;
      }
    };
    const said = (id) => handle.text().split('\n').filter((l) => l === `[gmux-push-seam] said ${id}`).length;

    await command([{ op: 'status' }]);
    const status0 = lastSeamLine('status');
    report.readings.status0 = status0;
    arm('P0 the door is not listening', status0?.door === 'off' && status0?.destinations === 2, `status ${J(status0)}`);

    // ---- MAIN's view, never the renderer's store --------------------------
    await cdpEval(cdp, `window.__gmuxP93.setup(${J({ path: PROJECT, names: [] })}).then(() => true)`);
    const mainSessions = async () =>
      JSON.parse(
        await cdpEval(
          cdp,
          'window.gmux.sessions.list().then((s) => JSON.stringify(s.map((x) => ({ id: x.id, name: x.name, status: x.status, tmuxName: x.tmuxName }))))'
        )
      );
    /**
     * Poll main until every named session reads `want`: `needs_input`, `clear`
     * (alive and not needs_input), or `ended`. Also answers whether any of them
     * was ever seen working (`running`) or idle on the way.
     */
    async function waitMain(names, want, ms) {
      const started = Date.now();
      let last = [];
      const seen = { running: false, idle: false };
      for (;;) {
        last = (await mainSessions()).filter((s) => names.includes(s.name));
        for (const s of last) {
          if (s.status === 'running') seen.running = true;
          if (s.status === 'idle') seen.idle = true;
        }
        // An ended session reads `exited`, or has left main's list altogether.
        const ok =
          want === 'ended'
            ? last.every((s) => s.status === 'exited')
            : last.length === names.length &&
              last.every((s) => (want === 'needs_input' ? s.status === 'needs_input' : s.status !== 'needs_input' && s.status !== 'exited'));
        if (ok) return { ok: true, last, seen, at: Date.now() };
        if (Date.now() - started >= ms) return { ok: false, last, seen, at: Date.now() };
        await sleep(700);
      }
    }
    /** The door's own rows, through the seam: main's feed, its stamps, its wake reading. */
    async function doorRows() {
      await command([{ op: 'blocked' }]);
      return lastSeamLine('blocked');
    }

    /** Start real agent sessions, each held in copy-mode the moment it exists when asked. */
    const live = {};
    async function launch(names, agent, { hold = false } = {}) {
      if (agents[agent].path === null) throw new Unreadable(`${AGENT_LABEL[agent]} is not here: ${agents[agent].why}`);
      const out = [];
      for (const name of names) {
        const created = await cdpEval(
          cdp,
          `window.__gmuxP202.createSession(${J(name)}, ${J(agent)}).then((x) => JSON.stringify(x)).catch((e) => 'ERR ' + String(e && e.message || e))`
        );
        let row;
        for (let i = 0; i < 80 && row === undefined; i += 1) {
          row = (await mainSessions()).find((s) => s.name === name);
          if (row === undefined) await sleep(250);
        }
        if (row === undefined) throw new Unreadable(`Tortie never created the ${AGENT_LABEL[agent]} session ${name} (it answered ${String(created).slice(0, 80)})`);
        const pane = paneOf(row.tmuxName);
        if (hold && pane !== null) tmuxRun(['copy-mode', '-t', pane.paneId]);
        const one = { name, id: row.id, agent, label: AGENT_LABEL[agent], pane: pane?.paneId ?? null, held: hold && pane !== null };
        live[name] = one;
        sessionIds[name] = row.id;
        out.push(one);
      }
      return out;
    }
    /** Release held sessions together: ONE tmux command, one `cancel` per pane. */
    function reveal(rows) {
      const args = [];
      for (const r of rows.filter((x) => x.held)) {
        if (args.length > 0) args.push(';');
        args.push('send-keys', '-X', '-t', r.pane, 'cancel');
      }
      if (args.length > 0) tmuxRun(args);
    }
    /** Wait until every pane has DRAWN `pattern` (the probe's own read of its own panes). */
    async function waitDrawn(rows, pattern, ms) {
      const started = Date.now();
      for (;;) {
        const drawn = rows.filter((r) => pattern.test(screenOf(r.pane)));
        if (drawn.length === rows.length) return { ok: true, drawn: drawn.length };
        if (Date.now() - started >= ms) return { ok: false, drawn: drawn.length };
        await sleep(500);
      }
    }
    /** Step 1 of every arm: did these sessions really block, in main? */
    async function blocked(armId, rows, ms, pattern) {
      noteAgentProcs();
      const r = await waitMain(rows.map((x) => x.name), 'needs_input', ms);
      noteAgentProcs();
      if (r.ok) return r;
      const drawn = rows.filter((x) => pattern.test(screenOf(x.pane))).length;
      const statuses = r.last.map((s) => `${s.name}=${s.status}`).join(', ');
      throw new Unreadable(
        `${armId}: ${rows[0].label} ${rows.map((x) => x.name).join(', ')} did not all reach needs_input in main within ${String(ms)} ms (${statuses}); ` +
          (drawn === rows.length
            ? 'every pane drew its question, so the status monitor did not confirm it: not a push reading'
            : `${String(drawn)} of ${String(rows.length)} pane(s) drew the question at all`)
      );
    }
    /** End sessions through main and wait for them to read ended. */
    async function end(names) {
      noteAgentProcs();
      for (const name of names) {
        const one = live[name];
        if (one === undefined) continue;
        await cdpEval(cdp, `window.gmux.sessions.kill(${J(one.id)}).then(() => 'ok').catch((e) => 'ERR ' + String(e && e.message || e))`);
        delete live[name];
      }
      await waitMain(names.filter((n) => sessionIds[n] !== undefined), 'ended', 30_000);
      await endOrphans();
    }
    /**
     * A real Gemini CLI does NOT end on the hang-up tmux sends when its session
     * ends (measured before this run: both its processes outlived a
     * kill-server and ended on the first TERM). So every agent process this
     * run recorded that is no longer under a live pane of the scratch server,
     * and still carries the command line it was recorded with, is ended here
     * by pid: TERM, then KILL. The count is a reading.
     */
    async function endOrphans() {
      await sleep(1_500);
      const panes = tmuxRun(['list-panes', '-a', '-F', '#{pane_pid}']);
      const livePanes = new Set((panes.status === 0 ? panes.stdout ?? '' : '').split('\n').map(Number).filter((n) => n > 1));
      const ps = spawnSync('ps', ['-Ao', 'pid=,ppid='], { encoding: 'utf8' });
      const parent = new Map();
      for (const line of (ps.stdout ?? '').split('\n')) {
        const m = /^\s*(\d+)\s+(\d+)/.exec(line);
        if (m !== null) parent.set(Number(m[1]), Number(m[2]));
      }
      const underLivePane = (pid) => {
        for (let p = pid, hops = 0; p > 1 && hops < 64; p = parent.get(p) ?? 0, hops += 1) {
          if (livePanes.has(p)) return true;
        }
        return false;
      };
      const orphans = [...agentProcs].filter(([pid, cmd]) => !underLivePane(pid) && commandOf(pid) === cmd).map(([pid]) => pid);
      for (const pid of orphans) {
        try {
          process.kill(pid, 'SIGTERM');
        } catch {
          /* already gone */
        }
      }
      if (orphans.length === 0) return;
      await sleep(2_000);
      for (const pid of orphans) {
        if (commandOf(pid) !== agentProcs.get(pid)) continue;
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          /* already gone */
        }
      }
      report.readings.orphansEnded = (report.readings.orphansEnded ?? 0) + orphans.length;
    }
    async function between(names, { quiet = true } = {}) {
      await end(names);
      if (!quiet) return;
      if (!(await waitQuiet(QUIET_MS))) say(`the stand-in never went quiet for ${String(QUIET_MS)} ms`);
    }
    /**
     * Run one arm's block. An Unreadable becomes an UNREADABLE reading for every
     * arm of the block not already graded, and is never a failure; anything
     * else thrown is a failure of the first arm not already graded.
     */
    async function section(ids, names, fn, { quiet = true } = {}) {
      const open = () => ids.filter((id) => !report.arms.some((a) => a.id === id));
      try {
        await fn();
      } catch (err) {
        if (err instanceof Unreadable) {
          for (const id of open()) arm(id, null, `unreadable: ${err.message}`);
        } else {
          arm(open()[0] ?? ids[0], false, `it threw: ${String(err?.message ?? err)}`);
        }
      } finally {
        standIn.clearScripts();
        await between(names.filter((n) => live[n] !== undefined), { quiet });
      }
    }
    /** Wait until a pane no longer draws `pattern`. */
    async function waitGone(paneId, pattern, ms) {
      const started = Date.now();
      while (Date.now() - started < ms) {
        if (!pattern.test(screenOf(paneId))) return true;
        await sleep(500);
      }
      return false;
    }
    /** One model turn, typed into the pane the way conformance:resume types one. */
    async function typeTurn(one, text) {
      tmuxRun(['send-keys', '-t', one.pane, '-l', text]);
      await sleep(600);
      tmuxRun(['send-keys', '-t', one.pane, 'Enter']);
      report.turns += 1;
      return Date.now();
    }
    /** Wait until a pane has not changed for `quietMs`, at most `maxMs`. */
    async function waitPaneQuiet(paneId, quietMs, maxMs) {
      const started = Date.now();
      let previous = '';
      let stableSince = Date.now();
      for (;;) {
        const now = screenOf(paneId);
        if (now !== previous) {
          previous = now;
          stableSince = Date.now();
        } else if (Date.now() - stableSince >= quietMs) {
          return true;
        }
        if (Date.now() - started >= maxMs) return false;
        await sleep(500);
      }
    }

    const projectName = PROJECT.split('/').pop();
    const alertOk = (rec, one) => {
      const p = bodyOf(rec);
      return (
        rec.status === 200 &&
        rec.method === 'POST' &&
        rec.path === `/3/device/${rec.token}` &&
        rec.jwt?.verifies === true &&
        rec.headers['apns-topic'] === TOPIC &&
        rec.headers['apns-push-type'] === 'alert' &&
        rec.headers['apns-priority'] === '10' &&
        Number(rec.headers['apns-expiration']) > 0 &&
        rec.headers['apns-id'] === null &&
        p?.aps?.alert?.title === `${one.name} needs input` &&
        p?.aps?.alert?.body === `${projectName} · ${one.label}` &&
        p?.aps?.sound === 'default' &&
        p?.aps?.['thread-id'] === one.id &&
        p?.tortie?.session === one.id &&
        rec.headers['apns-collapse-id'] === one.id
      );
    };
    const badgeOk = (rec, n) =>
      rec.body === `{"aps":{"badge":${String(n)}}}` &&
      rec.headers['apns-priority'] === '5' &&
      rec.headers['apns-expiration'] === '0' &&
      rec.headers['apns-collapse-id'] === null;
    const onePerPhone = (reqs) => reqs.length === 2 && toPhone(reqs, tokenA).length === 1 && toPhone(reqs, tokenB).length === 1;
    /** When an alert was expected and none came: was the row still blocked (a push reading) or not? */
    async function stillBlocked(rows) {
      const now = (await mainSessions()).filter((s) => rows.some((r) => r.name === s.name));
      return now.length === rows.length && now.every((s) => s.status === 'needs_input');
    }

    // ---- P1: inert --------------------------------------------------------
    await section(['P1 inert'], ['q1'], async () => {
      const from = requests().length;
      await command([{ op: 'push-off' }]);
      let on = false;
      try {
        const rows = await launch(['q1'], 'gemini');
        await blocked('P1', rows, 90_000, GEMINI_TRUST);
        await sleep(10_000);
        const offCount = requests().length - from;
        await command([{ op: 'push-on' }]);
        on = true;
        await sleep(10_000);
        arm('P1 inert', offCount === 0 && requests().length - from === 0,
          `q1 (Gemini CLI) blocked in main; ${String(offCount)} request(s) with the switch off, ${String(requests().length - from)} after it came back, because a row already blocked is not a join`);
      } finally {
        // Every later arm needs the switch on and the door confirmed.
        if (!on) await command([{ op: 'push-on' }]);
      }
    });

    // ---- P2 and P3: Claude Code, a real permission request, twice ---------
    // Claude Code first asks whether to trust the new folder. In the Claude
    // Code on this Mac that question draws no numerals and focuses "No, exit"
    // (`hideIndexes`, `cancelFirst`), so the screen tier cannot see it and a
    // bare Enter would end the session: the probe moves to "Yes, I trust this
    // folder" and presses Enter only once it reads that option focused. Then
    // turn 1 raises a permission request through the hook (P2), Escape refuses
    // it (the clear), turn 2 raises it again (the re-block), Escape refuses it
    // again and the session goes idle. TWO short turns, and no file is written.
    await section(['P2 single', 'P3 the clear is one badge-only 0', 'P3 the re-block replaces its own card', 'P3 working and idle raise nothing'], ['s1'], async () => {
      const launchedFrom = requests().length;
      const [s1] = await launch(['s1'], 'claude');
      const trust = await waitDrawn([s1], CLAUDE_TRUST, 90_000);
      if (!trust.ok) throw new Unreadable('P2: Claude Code s1 never drew its folder trust question within 90 s, so the probe typed nothing');
      // A reading for Phase 319: does main see this question as a block at all?
      const trustBlocked = await waitMain(['s1'], 'needs_input', 8_000);
      report.readings.claudeTrust = { numerals: /^\s*[❯›>]?\s*1[.)]\s/m.test(screenOf(s1.pane)), blockedInMain: trustBlocked.ok };
      let answered = false;
      for (let i = 0; i < 3 && !answered; i += 1) {
        if (CLAUDE_TRUST_YES_FOCUSED.test(screenOf(s1.pane))) {
          tmuxRun(['send-keys', '-t', s1.pane, 'Enter']);
          answered = true;
        } else {
          tmuxRun(['send-keys', '-t', s1.pane, 'Down']);
          await sleep(700);
        }
      }
      if (!answered) throw new Unreadable('P2: the probe never read "Yes, I trust this folder" focused on Claude Code’s trust question, so it pressed nothing');
      if (!(await waitGone(s1.pane, CLAUDE_TRUST, 30_000))) throw new Unreadable('P2: Claude Code s1 still drew its trust question after the answer');
      await waitMain(['s1'], 'clear', 30_000);
      await waitPaneQuiet(s1.pane, 3_000, 40_000);
      // THE SAFEGUARD ON. The person's own Claude Code starts in a mode that
      // does not ask (its footer says so), so a write never becomes a
      // permission request there. Shift+Tab is his own keystroke for the
      // session's mode, and the probe presses it until the footer reads the
      // mode that asks. No flag, no settings file: this session only.
      const startedIn = CLAUDE_MODE.exec(screenOf(s1.pane))?.[1] ?? null;
      for (let i = 0; i < 5 && !CLAUDE_ASKS_MODE.test(screenOf(s1.pane)); i += 1) {
        tmuxRun(['send-keys', '-t', s1.pane, 'BTab']);
        await sleep(1_200);
      }
      const nowIn = CLAUDE_MODE.exec(screenOf(s1.pane))?.[1] ?? null;
      report.readings.claudeMode = { startedIn, set: nowIn };
      if (!CLAUDE_ASKS_MODE.test(screenOf(s1.pane))) {
        throw new Unreadable(`P2: Claude Code s1 never reached the mode that asks (it started in ${J(startedIn)} and reads ${J(nowIn)}), so no permission request can be raised`);
      }
      // Whatever the trust question caused (nothing, when main never saw it) is
      // not P2's: wait it out so P2 reads only the permission request.
      if (requests().length > launchedFrom) await waitQuiet(QUIET_MS);

      // TURN 1: a real permission request, through the hook.
      let from = requests().length;
      const turn1At = await typeTurn(s1, CLAUDE_TURN);
      const asked1 = await waitMain(['s1'], 'needs_input', 180_000);
      if (!asked1.ok) {
        throw new Unreadable(
          `P2: Claude Code never raised a permission request within 180 s of turn 1 (main reads ${asked1.last.map((s) => s.status).join(',')}); ` +
            (existsSync(CLAUDE_FILE) ? 'it wrote the file without asking, so the person’s own permission settings allow it' : 'no file was written either')
        );
      }
      const duringWork1 = requests().length - from;
      const p2 = await waitRequests(from, 2, 60_000);
      report.readings.P2 = { requests: p2.map(redacted), msToPermission: asked1.at - turn1At, sawWorking: asked1.seen.running, drewQuestion: CLAUDE_ASKS.test(screenOf(s1.pane)) };
      if (p2.length === 0 && !(await stillBlocked([s1]))) {
        throw new Unreadable('P2: the permission request left the blocked set before the flush, so there was nothing to announce');
      }
      arm('P2 single', onePerPhone(p2) && p2.every((r) => alertOk(r, s1) && bodyOf(r)?.aps?.badge === 1),
        `s1 (Claude Code) blocked in main on a real permission request ${String(asked1.at - turn1At)} ms after turn 1; ${String(p2.length)} request(s): ${J(p2.map((r) => ({ phone: r.token === tokenA ? 'A' : 'B', status: r.status, verifies: r.jwt?.verifies, bytes: r.bodyBytes })))}`);

      // THE CLEAR: the write refused, the way a person refuses it.
      from = requests().length;
      tmuxRun(['send-keys', '-t', s1.pane, 'Escape']);
      const cleared = await waitMain(['s1'], 'clear', 60_000);
      if (!cleared.ok) throw new Unreadable(`P3: after Escape s1 still reads ${cleared.last.map((s) => s.status).join(',')} in main`);
      const fall = await waitRequests(from, 2, 90_000);
      report.readings.P3_fall = fall.map(redacted);
      arm('P3 the clear is one badge-only 0', fall.length === 2 && fall.every((r) => badgeOk(r, 0)),
        `the refusal cleared s1 in main; the clear sent ${J(fall.map((r) => ({ bytes: r.bodyBytes, priority: r.headers['apns-priority'], expiration: r.headers['apns-expiration'] })))}`);

      // TURN 2: the same session asks again.
      await waitPaneQuiet(s1.pane, 3_000, 40_000);
      const beforeTurn2 = requests().length;
      const turn2At = await typeTurn(s1, CLAUDE_TURN_AGAIN);
      const asked2 = await waitMain(['s1'], 'needs_input', 180_000);
      if (!asked2.ok) {
        throw new Unreadable(`P3: Claude Code did not ask again within 180 s of turn 2 (main reads ${asked2.last.map((s) => s.status).join(',')}); the file was written: ${String(existsSync(CLAUDE_FILE))}`);
      }
      const duringWork2 = requests().length - beforeTurn2;
      const again = await waitRequests(requests().length, 2, 90_000);
      report.readings.P3_again = { requests: again.map(redacted), msToPermission: asked2.at - turn2At, sawWorking: asked2.seen.running };
      if (again.length === 0 && !(await stillBlocked([s1]))) {
        throw new Unreadable('P3: the second permission request left the blocked set before the flush, so there was nothing to announce');
      }
      arm('P3 the re-block replaces its own card',
        onePerPhone(again) && again.every((r) => alertOk(r, s1)) &&
          again.every((r) => r.headers['apns-collapse-id'] === p2.find((x) => x.token === r.token)?.headers['apns-collapse-id'] &&
            bodyOf(r)?.aps?.['thread-id'] === bodyOf(p2.find((x) => x.token === r.token) ?? {})?.aps?.['thread-id']),
        `the second real permission request blocked s1 in main ${String(asked2.at - turn2At)} ms after turn 2; collapse id and thread id equal to P2’s: ${J(again.map((r) => r.headers['apns-collapse-id'] === s1.id))}`);

      // REFUSE again, then watch it go idle.
      const beforeEsc = requests().length;
      tmuxRun(['send-keys', '-t', s1.pane, 'Escape']);
      const refused = await waitMain(['s1'], 'clear', 60_000);
      await waitRequests(beforeEsc, 2, 90_000);
      let sawIdle = false;
      const watchUntil = Date.now() + 20_000;
      while (Date.now() < watchUntil) {
        if ((await mainSessions()).find((x) => x.name === 's1')?.status === 'idle') sawIdle = true;
        await sleep(700);
      }
      const afterEsc = requests().slice(beforeEsc);
      const written = existsSync(CLAUDE_FILE);
      const sawWorking = asked1.seen.running && asked2.seen.running;
      report.readings.P3_refused = { cleared: refused.ok, requests: afterEsc.map(redacted), sawIdle, fileWritten: written };
      const reading =
        `${String(duringWork1)} and ${String(duringWork2)} request(s) while turns 1 and 2 worked (working seen in main both times: ${String(sawWorking)}); ` +
        `after the second refusal ${J(afterEsc.map((r) => (badgeOk(r, 0) ? 'badge 0' : 'other')))} and idle seen in main: ${String(sawIdle)}; the file was written: ${String(written)}`;
      if (!sawWorking || !refused.ok || !sawIdle) {
        arm('P3 working and idle raise nothing', null, `unreadable: Claude Code s1 did not pass through working and then idle in main, so the arm has nothing to judge; ${reading}`);
      } else {
        arm('P3 working and idle raise nothing',
          duringWork1 === 0 && duringWork2 === 0 && afterEsc.length === 2 && afterEsc.every((r) => badgeOk(r, 0)) && !written, reading);
      }
    });

    // ---- P4: at once, as many as the monitor confirms together ------------
    const atOnce = Array.from({ length: CAPTURES }, (_, i) => `a${String(i + 1)}`);
    await section([`P4 ${String(CAPTURES)} at once`], atOnce, async () => {
      const rows = await launch(atOnce, 'gemini', { hold: true });
      const drawn = await waitDrawn(rows, GEMINI_TRUST, 90_000);
      if (!drawn.ok) throw new Unreadable(`P4: only ${String(drawn.drawn)} of ${String(rows.length)} Gemini CLI panes drew the trust question within 90 s`);
      const early = (await mainSessions()).filter((s) => atOnce.includes(s.name) && s.status === 'needs_input').map((s) => s.name);
      if (early.length > 0) throw new Unreadable(`P4: ${J(early)} were seen blocked before the release, so they did not join together`);
      const from = requests().length;
      reveal(rows);
      await blocked('P4', rows, 60_000, GEMINI_TRUST);
      const door = await doorRows();
      const stamps = (door?.rows ?? []).filter((r) => atOnce.includes(r.name)).map((r) => r.blockedSince);
      const spread = stamps.length === 0 ? null : Math.max(...stamps) - Math.min(...stamps);
      await sleep(COALESCE_MS + 4_000);
      const p4 = requests().slice(from);
      report.readings.P4 = { requests: p4.map(redacted), spreadMs: spread, captures: CAPTURES };
      if (spread === null || spread > COALESCE_MS) {
        throw new Unreadable(`P4: the door stamped the ${String(CAPTURES)} joins ${String(spread)} ms apart, wider than COALESCE_MS, so they were not "at once"`);
      }
      const title = `Needs your input (${String(CAPTURES)})`;
      arm(`P4 ${String(CAPTURES)} at once`,
        onePerPhone(p4) &&
          p4.every((r) => {
            const p = bodyOf(r);
            const names = String(p?.aps?.alert?.body ?? '').split(' · ');
            return (
              r.status === 200 &&
              p?.aps?.alert?.title === title &&
              p?.aps?.badge === CAPTURES &&
              r.headers['apns-collapse-id'] === 'tortie-waiting' &&
              atOnce.every((n) => names.includes(n))
            );
          }),
        `${String(CAPTURES)} Gemini CLI sessions blocked in main within ${String(spread)} ms of each other; ${String(p4.length)} request(s), titles ${J(p4.map((r) => bodyOf(r)?.aps?.alert?.title))}; twenty at once is conformance:push E3’s`);
    });

    // ---- P4b: the coalesced window -----------------------------------------
    await section(['P4b the coalesced window'], ['x1', 'x2', 'x3'], async () => {
      const from = requests().length;
      const [x1] = await launch(['x1'], 'gemini');
      await blocked('P4b', [x1], 90_000, GEMINI_TRUST);
      const first = await waitRequests(from, 2, 60_000);
      if (first.length === 0 && !(await stillBlocked([x1]))) throw new Unreadable('P4b: x1 left the blocked set before the flush');
      const firstAt = first[0]?.at ?? Date.now();
      const [x2] = await launch(['x2'], 'gemini');
      await sleep(8_000);
      const [x3] = await launch(['x3'], 'gemini');
      await blocked('P4b', [x2, x3], 60_000, GEMINI_TRUST);
      const door = await doorRows();
      const stamp = Object.fromEntries((door?.rows ?? []).map((r) => [r.name, r.blockedSince]));
      const second = await waitRequests(from + first.length, 2, FLOOR_MS + 30_000);
      await sleep(5_000);
      const rest = requests().slice(from + first.length);
      const secondAt = second[0]?.at ?? 0;
      report.readings.P4b = { first: first.map(redacted), rest: rest.map(redacted), stamps: stamp, firstAt, secondAt };
      if (!(stamp['x2'] > firstAt && stamp['x3'] > firstAt && (secondAt === 0 || (stamp['x2'] < secondAt && stamp['x3'] < secondAt)))) {
        throw new Unreadable(`P4b: x2 and x3 did not both join between the first alert and the floor (stamps ${J(stamp)}, sends at ${String(firstAt)} and ${String(secondAt)})`);
      }
      const newestFirst = ['x2', 'x3'].sort((a, b) => stamp[b] - stamp[a]).join(' · ');
      arm('P4b the coalesced window',
        onePerPhone(first) && first.every((r) => alertOk(r, x1)) &&
          onePerPhone(rest) &&
          rest.every((r) => {
            const p = bodyOf(r);
            return r.status === 200 && p?.aps?.alert?.title === 'Needs your input (3)' && p?.aps?.alert?.body === newestFirst && p?.aps?.badge === 3 && r.headers['apns-collapse-id'] === 'tortie-waiting';
          }) &&
          secondAt - firstAt >= FLOOR_MS - 1_000,
        `x1 alone, then x2 and x3 joined ${String(stamp['x2'] - firstAt)} ms and ${String(stamp['x3'] - firstAt)} ms after it; ONE more request per phone ${String(secondAt - firstAt)} ms after the first (the floor is ${String(FLOOR_MS)}), body ${J(bodyOf(rest[0] ?? {})?.aps?.alert?.body ?? null)}`);
    });

    // ---- P5: THE WAKE ------------------------------------------------------
    await section(['P5 THE WAKE is one alert per phone', 'P5 the door says so too', 'P5 the provider token was re-minted across the eight hours'], ['w1', 'w2', 'w3'], async () => {
      const rows = await launch(['w1', 'w2', 'w3'], 'gemini', { hold: true });
      const drawn = await waitDrawn(rows, GEMINI_TRUST, 90_000);
      if (!drawn.ok) throw new Unreadable(`P5: only ${String(drawn.drawn)} of 3 Gemini CLI panes drew the trust question within 90 s`);
      const early = (await mainSessions()).filter((s) => ['w1', 'w2', 'w3'].includes(s.name) && s.status === 'needs_input').map((s) => s.name);
      if (early.length > 0) throw new Unreadable(`P5: ${J(early)} were seen blocked before the sleep, so they are not first seen at the wake`);
      const from = requests().length;
      const iatBefore = requests().filter((r) => r.jwt?.claims?.iat !== undefined).map((r) => r.jwt.claims.iat).pop() ?? 0;
      await command([{ op: 'suspend' }]);
      const beforeResume = Date.now();
      await command([{ op: 'resume' }, { op: 'clock', offsetMs: EIGHT_HOURS }]);
      const afterResume = Date.now();
      probeClock.push({ event: 'resume', before: beforeResume, after: afterResume });
      reveal(rows);
      const b = await blocked('P5', rows, WAKE_MS, GEMINI_TRUST);
      const p5 = await waitRequests(from, 2, WAKE_MS + 30_000);
      await sleep(3_000);
      const p5all = requests().slice(from);
      const door = await doorRows();
      report.readings.P5 = { requests: p5all.map(redacted), door, resume: probeClock[probeClock.length - 1], blockedAfterResumeMs: b.at - afterResume };
      const wakeBody = String(bodyOf(p5[0] ?? {})?.aps?.alert?.body ?? '');
      arm('P5 THE WAKE is one alert per phone',
        onePerPhone(p5all) &&
          p5all.every((r) => bodyOf(r)?.aps?.alert?.title === 'Needs your input (3)' && r.headers['apns-collapse-id'] === 'tortie-waiting') &&
          wakeBody.startsWith('Seen when your Mac woke · ') && ['w1', 'w2', 'w3'].every((w) => wakeBody.includes(w)),
        `three Gemini CLI sessions blocked in main ${String(b.at - afterResume)} ms after the resume; ${String(p5all.length)} request(s), the first at resume + ${String((p5[0]?.at ?? 0) - afterResume)} ms, body ${J(wakeBody)}`);
      const doorSeen = Object.fromEntries((door?.rows ?? []).map((r) => [r.name, r.seenAtWake]));
      arm('P5 the door says so too', ['w1', 'w2', 'w3'].every((w) => doorSeen[w] === true) && (door?.rows ?? []).every((r) => ['w1', 'w2', 'w3'].includes(r.name) || r.seenAtWake === false),
        `the door’s rows read ${J(doorSeen)}`);
      const iatWake = p5[0]?.jwt?.claims?.iat ?? 0;
      arm('P5 the provider token was re-minted across the eight hours', iatWake - iatBefore >= 8 * 3600,
        `iat moved ${String(iatWake - iatBefore)} s`);
    });

    // ---- P6: the clock backwards, and one ExpiredProviderToken ---------------
    await section(['P6 one re-mint and one retry'], ['c1'], async () => {
      const from = requests().length;
      await command([{ op: 'clock', offsetMs: EIGHT_HOURS - TWO_HOURS }]);
      standIn.script(tokenA, { status: 403, reason: 'ExpiredProviderToken' });
      const rows = await launch(['c1'], 'gemini');
      await blocked('P6', rows, 90_000, GEMINI_TRUST);
      await waitRequests(from, 3, 60_000);
      await sleep(4_000);
      const p6 = requests().slice(from);
      report.readings.P6 = p6.map(redacted);
      if (p6.length === 0 && !(await stillBlocked(rows))) throw new Unreadable('P6: c1 left the blocked set before the flush');
      const p6a = toPhone(p6, tokenA);
      arm('P6 one re-mint and one retry',
        p6a.length === 2 && p6a[0].status === 403 && p6a[1].status === 200 && p6a[0].authorizationDigest !== p6a[1].authorizationDigest && toPhone(p6, tokenB).length === 1 &&
          p6.every((r) => !/[:[,]\s*-\d/.test(r.body) && Number(r.headers['apns-expiration']) > 0),
        `c1 (Gemini CLI) blocked in main; A: ${J(p6a.map((r) => r.status))}, B: ${String(toPhone(p6, tokenB).length)}`);
    });

    // ---- P7: the key broken ------------------------------------------------
    await section(['P7 a key that cannot be opened sends nothing and says so once'], ['k1'], async () => {
      const from = requests().length;
      const saidBefore = said('no-key');
      await command([{ op: 'break-key' }]);
      try {
        const rows = await launch(['k1'], 'gemini');
        await blocked('P7', rows, 90_000, GEMINI_TRUST);
        await sleep(15_000);
        await command([{ op: 'status' }]);
        const status7 = lastSeamLine('status');
        report.readings.P7 = { requests: requests().length - from, status: status7 };
        arm('P7 a key that cannot be opened sends nothing and says so once',
          requests().length - from === 0 && said('no-key') === saidBefore + 1 && status7 !== null,
          `k1 (Gemini CLI) blocked in main; ${String(requests().length - from)} request(s), said no-key ${String(said('no-key') - saidBefore)} time(s), status ${J(status7?.engine ?? null)}`);
      } finally {
        await command([{ op: 'restore-key' }]);
      }
    });

    // ---- P8: 410 ------------------------------------------------------------
    await section(['P8 a 410 drops the token', 'P8 and B is never asked again'], ['g1', 'g2'], async () => {
      const from = requests().length;
      standIn.script(tokenB, { status: 410, reason: 'Unregistered' });
      const [g1] = await launch(['g1'], 'gemini');
      await blocked('P8', [g1], 90_000, GEMINI_TRUST);
      await waitRequests(from, 2, 60_000);
      await sleep(3_000);
      const p8 = requests().slice(from);
      await command([{ op: 'status' }]);
      const status8 = lastSeamLine('status');
      report.readings.P8 = { first: p8.map(redacted), status: status8 };
      if (p8.length === 0 && !(await stillBlocked([g1]))) throw new Unreadable('P8: g1 left the blocked set before the flush');
      arm('P8 a 410 drops the token',
        toPhone(p8, tokenA).length === 1 && toPhone(p8, tokenA)[0].status === 200 && toPhone(p8, tokenB).length === 1 && toPhone(p8, tokenB)[0].status === 410 &&
          status8?.stopped === 1 && status8?.storeDead === 1 && (status8?.phones ?? []).find((p) => p.label === 'B')?.alerts === 'stopped',
        `g1 (Gemini CLI) blocked in main; A ${J(toPhone(p8, tokenA).map((r) => r.status))}, B ${J(toPhone(p8, tokenB).map((r) => r.status))}, status ${J(status8)}`);
      await waitQuiet(QUIET_MS);
      const second = requests().length;
      const [g2] = await launch(['g2'], 'gemini');
      await blocked('P8', [g2], 90_000, GEMINI_TRUST);
      await waitRequests(second, 1, 60_000);
      await sleep(5_000);
      const p8b = requests().slice(second);
      report.readings.P8.second = p8b.map(redacted);
      arm('P8 and B is never asked again', toPhone(p8b, tokenA).length === 1 && toPhone(p8b, tokenB).length === 0,
        `g2 (Gemini CLI) blocked in main; the next alert went to A ${String(toPhone(p8b, tokenA).length)} time(s) and B ${String(toPhone(p8b, tokenB).length)}`);
    });

    // ---- P9: removed ----------------------------------------------------------
    await section(['P9 a removed phone is never asked, before or after a confirm'], ['r1', 'r2'], async () => {
      const from = requests().length;
      await command([{ op: 'remove-phone', label: 'A' }]);
      const [r1] = await launch(['r1'], 'gemini');
      await blocked('P9', [r1], 90_000, GEMINI_TRUST);
      await sleep(15_000);
      const before9 = requests().length - from;
      await command([{ op: 'confirm' }]);
      const [r2] = await launch(['r2'], 'gemini');
      await blocked('P9', [r2], 90_000, GEMINI_TRUST);
      await sleep(15_000);
      report.readings.P9 = { beforeConfirm: before9, afterConfirm: requests().length - from - before9 };
      arm('P9 a removed phone is never asked, before or after a confirm', before9 === 0 && requests().length - from === 0 && toPhone(requests().slice(from), tokenA).length === 0,
        `r1 and r2 (Gemini CLI) blocked in main; ${String(before9)} request(s) before the confirm and ${String(requests().length - from - before9)} after`);
    }, { quiet: false });

    noteAgentProcs();
    cdp.close();
  }

  await withElectron(
    {
      label: 'p314',
      userDataDir: PROFILE,
      cwd: CHECKOUT,
      tmuxSocket: SOCKET,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: withoutDevRenderer({
        // Not this agent's child: every Claude Code session variable the probe
        // inherited from whoever ran it is REMOVED from the app, and so from
        // every pane, because the person's own Tortie, started from the Dock,
        // has none (his login shell sets none either).
        ...INHERITED_CLAUDE,
        HOME,
        GMUX_TMUX_SOCKET: SOCKET,
        GMUX_PROBES: '1',
        GMUX_LOG_FILE: '1',
        GMUX_SPECSTORY_NO_CLOUD: '1',
        GMUX_CONFIG_ROOT: join(PROFILE, 'gmux', 'config'),
        GMUX_HARNESS_DIR: HARNESS,
        GMUX_HARNESS_PUSH: PUSH_DIR
      }),
      graceMs: 8_000,
      ceilingMs: 2_400_000
    },
    async (handle) => {
      try {
        await body(handle);
      } finally {
        appText = handle.text();
        shimPid = handle.pid;
        try {
          appPid = handle.appPid();
        } catch {
          appPid = 0;
        }
      }
    }
  );
  ran = true;

  // ---- P10: app.log, after the app is gone ----------------------------------
  if (!AT_PARENT || report.arms.some((a) => a.ok !== null)) {
    try {
      const log = readFileSync(join(PROFILE, 'logs', 'app.log'), 'utf8');
      const needles = [
        [tokenA, 'phone A’s device token'],
        [tokenB, 'phone B’s device token'],
        ...requests()
          .filter((r) => r.authorization !== null)
          .map((r) => [r.authorization, 'a recorded provider token']),
        ...requests().map((r) => [r.body, 'a recorded payload']),
        ...pemLines.map((l) => [l, 'a line of the PEM body'])
      ];
      const hits = [...new Set(needles.filter(([needle]) => needle.length >= 16 && log.includes(needle)).map(([, what]) => what))];
      report.readings.P10 = { bytes: log.length, hits };
      arm('P10 the log', hits.length === 0,
        `${String(log.length)} bytes of app.log, and ${hits.length === 0 ? `none of ${String(needles.length)} needles is in it` : `it holds ${J(hits)}`}`);
    } catch (err) {
      arm('P10 the log', false, `app.log is unreadable: ${String(err?.message ?? err)}`);
    }
  }

  // ---- what the verifier's re-derivation reads, kept only on request --------
  if (KEEP) {
    mkdirSync(join(RUN, 'rederive'), { recursive: true });
    writeFileSync(
      join(RUN, 'rederive', 'records.json'),
      `${J(
        {
          note: 'Synthetic: every token and the key are this run’s own. SPEC §4.2 reads this.',
          publicKeyPem: publicPem,
          keyId: KEY_ID,
          teamId: TEAM_ID,
          topic: TOPIC,
          phones: { A: tokenA, B: tokenB },
          sessions: sessionIds,
          probeClock,
          seamLines: appText.split('\n').filter((l) => l.startsWith('[gmux-push-seam] ')),
          requests: requests()
        },
        null,
        1
      )}\n`,
      { mode: 0o600 }
    );
    say(`kept the scratch world at ${RUN}; the re-derivation reads ${join(RUN, 'rederive', 'records.json')}`);
  }
} catch (err) {
  arm('the run', false, `it threw: ${String(err?.message ?? err)}`);
} finally {
  if (standIn !== null) await standIn.close().catch(() => undefined);
  // THE KEY GOES WHATEVER HAPPENED, kept world or not.
  try {
    rmSync(KEY_FILE, { force: true });
  } catch {
    /* already gone */
  }
  // THE AGENTS. The teardown ended the scratch server, which hangs up every
  // pane; anything this run saw that is STILL running with the same command
  // line is ended here, by pid, TERM first and then KILL.
  const leftAfterTeardown = [...agentProcs].filter(([pid, cmd]) => commandOf(pid) === cmd).map(([pid]) => pid);
  for (const pid of leftAfterTeardown) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
  }
  if (leftAfterTeardown.length > 0) await sleep(3_000);
  const stillUp = leftAfterTeardown.filter((pid) => commandOf(pid) === agentProcs.get(pid));
  for (const pid of stillUp) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  if (stillUp.length > 0) await sleep(1_000);
  const survivors = [...agentProcs].filter(([pid, cmd]) => commandOf(pid) === cmd).length;
  report.readings.agentProcesses = { seen: agentProcs.size, leftAfterTeardown: leftAfterTeardown.length, neededKill: stillUp.length, survivors };
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
}

// ---- Electron and the agents, counted once, at the end ------------------------
const ps = spawnSync('ps', ['-Ao', 'pid,ppid,rss,comm'], { encoding: 'utf8' });
const electronLines = (ps.stdout ?? '').split('\n').filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l));
// CLAUDE.md: the main process renames itself `Tortie` and carries NO argument,
// so a search for the profile misses it. It is found by the pids this run's
// launch started: the app itself, or anything whose parent is the shim.
const ours = electronLines.filter((l) => {
  const [pid, ppid] = l.trim().split(/\s+/).map(Number);
  if (appPid > 0 && (pid === appPid || ppid === appPid)) return true;
  if (shimPid > 0 && (pid === shimPid || ppid === shimPid)) return true;
  return commandOf(pid).includes(PROFILE);
});
report.readings.electron = { lines: electronLines.length, ofThisRun: ours.length, shimPid, appPid };
arm('no Electron of this run is left', ours.length === 0,
  `${String(electronLines.length)} Electron line(s) on the machine (the operator’s own Tortie included), ${String(ours.length)} of this run`);
const agentCount = report.readings.agentProcesses ?? { seen: 0, leftAfterTeardown: 0, neededKill: 0, survivors: 0 };
arm('no agent process of this run is left', agentCount.survivors === 0,
  `${String(agentCount.seen)} agent process(es) seen under the scratch server; ${String(agentCount.leftAfterTeardown)} still up after the teardown were ended here by pid (${String(agentCount.neededKill)} needed a KILL); ${String(agentCount.survivors)} left`);
say(`model turns spent: ${String(report.turns)}`);

const OUT = join(ROOT, 'out', 'p314');
mkdirSync(OUT, { recursive: true });
const outFile = join(OUT, `probe-p314${AT_PARENT ? '-parent' : ''}.json`);
writeFileSync(outFile, `${J(report, null, 1)}\n`, 'utf8');
say(`wrote ${outFile}`);
const unreadable = report.arms.filter((a) => a.ok === null).length;
if (AT_PARENT && failures === 0) {
  say(`probe:p314 at the parent: ${String(unreadable)} arm(s) unreadable, as a build before the seam must read`);
  process.exit(0);
}
if (ran && failures === 0 && unreadable > 0) {
  say(`probe:p314 could not READ ${String(unreadable)} arm(s) at this build; that is not a pass`);
  process.exit(2);
}
say(!ran ? 'probe:p314 did not complete' : failures === 0 ? 'probe:p314 OK' : `probe:p314 FAILED ${String(failures)} arm(s)`);
process.exit(ran && failures === 0 ? 0 : 1);
