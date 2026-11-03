#!/usr/bin/env node
/**
 * electron-run.mjs. One place that starts an Electron, and one place that ends
 * it (Phase 140).
 *
 * ## Why this file exists
 *
 * On 2026-08-22 the operator's machine ran out of memory and crashed. Every
 * worktree was destroyed and 163 files of uncommitted work were lost. The cause
 * was not memory being tight. It was that 43 of the 51 scripts under build/
 * that start an Electron ended it only on the happy path. An assertion that
 * throws before the kill line leaves an Electron running. A verifier that
 * retries a failing probe, or runs several in sequence where the first throws,
 * stacks them. One instance is about 480 MB resident. Sixty of them is the
 * machine.
 *
 * The fix is not 43 hand written `finally` blocks. It is one function that owns
 * the launch, so the guarantee lives in one place and a gate can read it. That
 * gate is build/assert-electron-teardown.mjs.
 *
 * ## The two exports
 *
 *   withElectron(options, body)  Hold one Electron open, hand it to `body`, and
 *                                end its whole process tree whatever `body` did.
 *   runElectron(options)         Launch one Electron, wait for it to quit on its
 *                                own, and end its tree whatever happened. This
 *                                is withElectron with a body that only awaits
 *                                the exit, and it is what a photograph run wants.
 *
 * ## The socket refusal, added in Phase 261
 *
 * Twice a probe launched without a harness term, so `activeTmuxSocket` ignored
 * `GMUX_TMUX_SOCKET` and the app ran against `-L gmux`, the operator's live
 * server, and created sessions on it. The app logged that it was ignoring the
 * variable and nobody read the log. Phase 86.1's table says the next round
 * touching build/ must make the harness REFUSE such a launch rather than rely
 * on a person noticing, because relying on a person had been measured at 0 of 2.
 *
 * So this file now refuses a launch whose socket override would be ignored, and
 * since Phase 261's fix round one that names the live server ITSELF, which is
 * an override the app would OBEY (`socketRefusalReason`); it asks the app
 * which socket it really used and ends
 * the launch when the answer disagrees (`announcedSockets`,
 * `announcementFinding`), and it reads the sessions on the operator's own
 * server before and after a launch that names a scratch socket, judging each
 * one by identity since Phase 285 (`liveSessionRows`, `judgeCensus`,
 * `censusVerdict`): a launch fails for what it could have done to his server,
 * never for what he did. The full
 * reasoning, and why a scanner over build/ would not have done it, is at the
 * head of that section below.
 *
 * ## What the teardown does, and why each step is there
 *
 *  1. SIGTERM the recorded pid. `node_modules/electron/cli.js` is a nine line
 *     Node shim that forwards SIGINT, SIGTERM and SIGUSR2 to the app it
 *     started. It cannot forward SIGKILL, because nothing can. A SIGKILL to the
 *     shim therefore kills the shim, the app reparents to launchd, and it runs
 *     on. That was measured on 2026-08-23: the shim died, and 482 MB of Tortie
 *     stayed up. SIGTERM first is the whole reason this function exists.
 *  2. Wait up to `graceMs` for the recorded pid to go.
 *  3. Read the descendants with `pgrep -P` and SIGKILL every pid in that tree.
 *     The tree is read once BEFORE the SIGTERM as well as after, because a dead
 *     parent's children reparent to launchd and can no longer be found this
 *     way. Only pids descended from the one this call started are ever named.
 *  4. Sweep by profile path. Every process whose full command line contains
 *     this launch's own `--user-data-dir` is ended. That path is unique to this
 *     launch, it is refused unless it sits outside the repository and outside
 *     the person's home, and it is what catches the crash handler. The crash
 *     handler reparents to launchd immediately, so step 3 cannot see it. It is
 *     about 4 MB, so it is a small leak rather than a large one, but a leak
 *     with a name is a leak this file ends.
 *  5. Destroy the pipes. The shim runs with inherited stdio and a tmux server
 *     the app started inherits them, so Node never exits without this.
 *  6. End the scratch tmux server, when the caller named one. The names `gmux`
 *     and `default` are refused outright.
 *
 * There is no pkill anywhere in this file, and no kill by process name. Every
 * pid this file signals is either the one it started, a descendant of it, or a
 * process whose command line names this launch's own scratch profile.
 *
 * ## The safety net for `process.exit`
 *
 * A `finally` block does not run when the body calls `process.exit`, and many
 * probes end that way. So every live launch is also held in a module level
 * registry, and this file installs handlers once for `exit`, `SIGINT`,
 * `SIGTERM`, `uncaughtException` and `unhandledRejection`. The `exit` handler
 * is synchronous, because Node runs nothing asynchronous after that event. It
 * does the same tree kill and the same profile sweep with blocking calls.
 *
 * ## What this file does not promise
 *
 * It does not promise the machine holds no Electron at any instant. It promises
 * that no Electron this file started outlives the process that started it.
 *
 * A process listing taken straight after a teardown can still show an entry
 * marked `<defunct>`. That is a dead process waiting for its parent to collect
 * it, it holds no memory, and launchd collects it. It is not a leak, and a
 * count that treats it as one is wrong.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[electron-run]';

/** The repository root, being the parent of build/. */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The three programs a script under build/ is allowed to start, by name. A
 * caller may also pass an absolute path of its own, e.g. a copy of the app
 * under a scratch directory that the update rehearsal makes.
 *
 * `shim` is the Node forwarder described in the header. Its pid is not the
 * app's pid. `app` is the Electron binary inside the development download, so
 * the pid it returns IS the app. `packaged` is the signed bundle the release
 * build writes.
 */
const PROGRAMS = {
  shim: join(repoRoot, 'node_modules', '.bin', 'electron'),
  app: join(
    repoRoot,
    'node_modules',
    'electron',
    'dist',
    'Electron.app',
    'Contents',
    'MacOS',
    'Electron'
  ),
  packaged: join(
    repoRoot,
    'release',
    'mac-arm64',
    'Tortie.app',
    'Contents',
    'MacOS',
    'Tortie'
  )
};

/** Every launch this process still holds. The safety net reads it. */
const live = new Map();
let netInstalled = false;
let nextLaunchId = 1;

// ---------------------------------------------------------------------------
// Reading the process table
// ---------------------------------------------------------------------------

/**
 * Every process descended from `pid`, read with `pgrep -P` one generation at a
 * time. The parent must still be alive for this to find anything, which is why
 * the teardown reads the tree before it signals as well as after.
 */
function descendants(pid) {
  const found = [];
  const stack = [pid];
  while (stack.length > 0) {
    const p = stack.pop();
    const r = spawnSync('pgrep', ['-P', String(p)], { encoding: 'utf8' });
    for (const line of (r.stdout ?? '').split('\n')) {
      const n = Number(line.trim());
      if (Number.isInteger(n) && n > 0 && !found.includes(n)) {
        found.push(n);
        stack.push(n);
      }
    }
  }
  return found;
}

/** True when a process id still exists. */
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code === 'EPERM';
  }
}

/**
 * This process and every process above it, so the profile sweep can never name
 * the script that is doing the sweeping. A probe invoked with its own profile
 * path on the command line would otherwise match itself.
 */
function ownAncestry() {
  const parents = new Map();
  const r = spawnSync('ps', ['-Ao', 'pid=,ppid='], { encoding: 'utf8' });
  for (const line of (r.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s*$/.exec(line);
    if (m !== null) parents.set(Number(m[1]), Number(m[2]));
  }
  const mine = new Set();
  let p = process.pid;
  while (Number.isInteger(p) && p > 1 && !mine.has(p)) {
    mine.add(p);
    p = parents.get(p) ?? 0;
  }
  return mine;
}

/**
 * Every process whose full command line contains `needle`, excluding this
 * process and its own ancestors. The needle is always an absolute scratch
 * profile path that this file refused to accept unless it sits outside the
 * repository and outside the person's home, so the match is bounded to one
 * launch's own files.
 */
function byProfilePath(needle) {
  const mine = ownAncestry();
  const hits = [];
  const r = spawnSync('ps', ['-Ao', 'pid=,command='], { encoding: 'utf8' });
  for (const line of (r.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (m === null) continue;
    const pid = Number(m[1]);
    if (!Number.isInteger(pid) || pid <= 1) continue;
    if (mine.has(pid)) continue;
    if (!m[2].includes(needle)) continue;
    hits.push(pid);
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Refusals. These run before anything starts.
// ---------------------------------------------------------------------------

/**
 * Why this profile path may not be used, or null when it is fine.
 *
 * Two refusals. A profile inside the repository would be committed by accident
 * and would make one run's state visible to the next. A profile under the
 * person's own home is how a probe reaches the operator's real Tortie data, and
 * the profile sweep in the teardown reads command lines for this exact string,
 * so a path under the home directory would let the sweep name his own running
 * app. The home checked is the real one from the operating system, not the
 * `HOME` a probe may have set in the child's environment.
 */
export function refuseProfileReason(userDataDir) {
  if (typeof userDataDir !== 'string' || userDataDir === '') {
    return 'a launch needs its own userDataDir and none was given.';
  }
  if (!userDataDir.startsWith('/')) {
    return `the userDataDir "${userDataDir}" is not an absolute path.`;
  }
  const path = resolve(userDataDir);
  if (path === repoRoot || path.startsWith(repoRoot + sep)) {
    return `the userDataDir "${path}" is inside the repository. Use a directory under TMPDIR or under the harness directory.`;
  }
  const home = resolve(homedir());
  if (path === home || path.startsWith(home + sep)) {
    return `the userDataDir "${path}" is under the person's home directory. A probe never opens a profile there.`;
  }
  if (path.length < 8) {
    return `the userDataDir "${path}" is too short to be a scratch profile.`;
  }
  return null;
}

/** Why this scratch tmux socket may not be ended, or null when it is fine. */
function refuseSocketReason(socket) {
  if (typeof socket !== 'string' || socket === '') {
    return 'a socket name was given and it is empty.';
  }
  if (socket === 'gmux' || socket === 'default') {
    return `the socket "${socket}" is not a scratch socket. That is the private server the operator's live work runs on.`;
  }
  if (!socket.startsWith('gmux-')) {
    return `the socket "${socket}" does not start with "gmux-", so it is not one of ours.`;
  }
  return null;
}

/** The absolute path of the program a launch names. */
function programPath(program) {
  if (program === undefined || program === 'shim') return PROGRAMS.shim;
  if (program === 'app') return PROGRAMS.app;
  if (program === 'packaged') return PROGRAMS.packaged;
  if (typeof program !== 'string' || !program.startsWith('/')) {
    throw new Error(
      `${TAG} program must be "shim", "app", "packaged" or an absolute path. Got ${String(program)}.`
    );
  }
  return program;
}

// ---------------------------------------------------------------------------
// PHASE 261. The socket refusal, the announcement and the census.
// ---------------------------------------------------------------------------
/**
 * WHY THESE FOUR THINGS ARE HERE, and they are one rule in four places.
 *
 * Twice a probe launched without a harness term, `activeTmuxSocket` therefore
 * IGNORED `GMUX_TMUX_SOCKET`, and the app ran against `-L gmux`, which is the
 * private server the operator's live agent work runs on. It created sessions
 * there: `shell-1-5` and `cursor-1-2` the first time, `shell-1-6` at 22:19:53
 * and `claude-1-4` at 22:20:20 on 2026-08-19 the second. The app said so, three
 * times, in the line "GMUX_TMUX_SOCKET is set but this is not a harness launch,
 * so it is ignored", and nobody read it. Phase 86.1's table recorded that the
 * next round touching build/ must make the harness REFUSE such a launch rather
 * than rely on a person noticing, because relying on a person had by then been
 * measured at 0 of 2.
 *
 * A scanner over build/ would not do it. A script that spreads `process.env`
 * into a child inherits the socket without ever naming it, which is the exact
 * shape of build/p134-about-shot.mjs, so the file-level scan is the check that
 * already failed. These are reached instead without anybody writing a line in a
 * new probe:
 *
 *   Layer 1  build/harness-socket.mjs hands every wrapped run `GMUX_PROBES=0`
 *            beside the socket it composes, so a wrapped run IS a harness
 *            launch and the socket it was given is honoured.
 *   Layer 2  socketRefusalReason() below, asked of the COMPOSED child env
 *            before anything is spawned or created.
 *   Layer 3  the app is ASKED which socket it used, and the answer is judged.
 *            That is the half that asserts rather than trusts: a variable that
 *            never reached the child, a term spelled wrongly, and a future
 *            change to isHarnessLaunch are all caught by one reading.
 *   Layer 4  censusVerdict() below, the operator's own ritual made mechanical,
 *            and since Phase 285 judged by identity rather than by count.
 *
 * The four terms are duplicated from src/main/harness/launch-gate.ts on
 * purpose. This is a build script and cannot import TypeScript, and the
 * duplication is what rule 5a of build/assert-electron-teardown.mjs drives: a
 * copy that drifts stops refusing the shape it exists to refuse, and the gate
 * reads the shipping helper rather than this list.
 */
const HARNESS_TERMS = Object.freeze([
  'GMUX_SMOKE',
  'GMUX_SHOT',
  'GMUX_UPDATE_REHEARSAL',
  'GMUX_PROBES'
]);

/**
 * Why this launch may not start, or null when it is fine. Layer 2.
 *
 * Three refusals, and each is a measured incident rather than a tidiness rule.
 * They are listed in the ORDER THEY ARE ASKED rather than by their letters, so
 * 2c sits in the middle: it was added after 2b existed, and where it is asked
 * is the property that keeps every other launch shape reading what it read
 * before, so the letters are left alone and the order is what is written down.
 *
 *   2a. The env names a socket and no harness term is set. `activeTmuxSocket`
 *       would ignore the socket and the app would run on `-L gmux`.
 *   2c. The env names a socket that is NOT a scratch socket, being `gmux`,
 *       `default` or any name that does not start with `gmux-`, whatever else
 *       the launch sets. PHASE 261'S FIX ROUND ADDED THIS ONE, and it is the
 *       opposite half of 2a: 2a catches an override the app would IGNORE, and
 *       this catches one the app would OBEY. The first verifier drove
 *       `GMUX_TMUX_SOCKET: 'gmux'` with a harness term beside it and
 *       `tmuxSocket: null`, and all four layers let it through — 2a permits it
 *       because a term IS set, the no-socket warning does not print because a
 *       socket WAS named, layer 3 finds the app's honest answer `gmux` equal to
 *       the `gmux` that was asked for, and layer 4 never ran because the
 *       census is read only for a launch that named a scratch socket, which
 *       is why 2c refuses the name itself. The app
 *       would then have created its sessions on the operator's live server with
 *       nothing anywhere saying so. It is refused whatever else is set, because
 *       a launch has no legitimate reason to point the app at that server.
 *       `refuseSocketReason` is the one spelling of what a scratch socket is,
 *       asked here of the ENV and below of the TEARDOWN name, so the two halves
 *       cannot drift apart.
 *
 *       AND A THIRD SPELLING EXISTS, WHICH THE COMMITTER'S ROUND RECORDED
 *       RATHER THAN CHANGED. The app has its own, `/^[A-Za-z0-9][A-Za-z0-9._-]*$/`
 *       in `src/main/tmux/resolve.ts`'s `activeTmuxSocket`, and it is STRICTER
 *       than this one. Driven: `gmux-a/b`, `gmux-a b`, `gmux-x/../gmux` and
 *       `gmux-!!` all pass 2c, because they start with `gmux-`, and the app
 *       then refuses each one and falls back to `gmux`, the live server. Layer
 *       3 catches every one of them, because the socket the app ANNOUNCES is
 *       then `gmux` and not the name that was asked for, subject to layer 3's
 *       own stated mid-line limit. So the safety property holds through a
 *       different layer than the one you would expect, and the two spellings
 *       agreeing is NOT what makes it hold. Tightening 2c to the app's own
 *       regex would be the tidier answer and it moves no reading this gate
 *       measures, which is exactly why it is a phase with a re-derivation
 *       rather than a nit: 2c was added to move one shape and nothing else.
 *   2b. `options.tmuxSocket` is a string and the composed env names a different
 *       socket, or names none at all. The teardown would then end a scratch
 *       server the app never used while the app used `-L gmux`. That is
 *       build/p256/probe-explorers.mjs's shape exactly.
 *
 * @param {Record<string, string|undefined>} env the COMPOSED child environment
 * @param {string|null|undefined} tmuxSocket the scratch socket the caller named
 * @returns {string|null}
 */
export function socketRefusalReason(env, tmuxSocket) {
  const want = String(env?.['GMUX_TMUX_SOCKET'] ?? '').trim();
  const terms = HARNESS_TERMS.filter((n) => String(env?.[n] ?? '') !== '');
  if (want !== '' && terms.length === 0) {
    return (
      `GMUX_TMUX_SOCKET is "${want}" in this launch's environment and no ` +
      `harness term is set, so the app would IGNORE it and run on -L gmux, ` +
      `which is the operator's live server. Set one of ` +
      `${HARNESS_TERMS.join(', ')} in the child's env. The smallest correct ` +
      `answer is GMUX_PROBES: '0', which makes it a harness launch for the ` +
      `socket and still arms no renderer drive.`
    );
  }
  if (want !== '') {
    // 2c. The env points the app at a server that is not one of ours. This is
    // asked AFTER 2a and BEFORE 2b deliberately: every other launch shape reads
    // exactly what it read before this clause existed, and the one shape that
    // moves is the one that was walking through.
    const notScratch = refuseSocketReason(want);
    if (notScratch !== null) {
      return (
        `GMUX_TMUX_SOCKET is "${want}" in this launch's environment, and ` +
        `${notScratch} A harness term makes the app OBEY that name rather ` +
        `than ignore it, so this launch would put its own sessions there and ` +
        `neither the announcement nor the census would say anything was ` +
        `wrong. Name a scratch socket of this run's own, being ` +
        `gmux-<phase>-<pid>, or run through build/harness-socket.mjs, which ` +
        `composes one.`
      );
    }
  }
  if (typeof tmuxSocket === 'string' && tmuxSocket !== '') {
    if (want === '') {
      return (
        `this launch names the scratch tmux socket "${tmuxSocket}" for its ` +
        `teardown and its environment names no GMUX_TMUX_SOCKET at all, so ` +
        `the app would run on -L gmux while the teardown ended an empty ` +
        `server. Put GMUX_TMUX_SOCKET: '${tmuxSocket}' in the child's env ` +
        `with a harness term beside it, or pass tmuxSocket: null when the ` +
        `launch starts no tmux of its own.`
      );
    }
    if (want !== tmuxSocket) {
      return (
        `this launch names the scratch tmux socket "${tmuxSocket}" for its ` +
        `teardown and its environment says GMUX_TMUX_SOCKET is "${want}". ` +
        `The teardown would end one server while the app used another. The ` +
        `two must be the same name.`
      );
    }
  }
  return null;
}

/** The line localMachineContext() prints once per launch. Layer 3. */
const ANNOUNCEMENT = /^\[gmux-socket\] local tmux socket: (\S+)/gm;

/**
 * Every socket the child has announced so far, in the order it announced them.
 *
 * ALL of them rather than the first, because an app that prints the line twice
 * with two different names must not be able to hide the second behind the
 * first. A line that arrives split across two chunks of output is read on the
 * next chunk, because this is asked of the ACCUMULATED text and never of one
 * chunk.
 *
 * STATED LIMIT, and it is why layer 4 exists rather than being a belt on a
 * brace. The match is ANCHORED to the start of a line, so an announcement that
 * lands mid line — a stderr write that ended without a newline immediately
 * before the child's own stdout chunk — is not read, and this layer then
 * asserts nothing about that launch. The anchor is kept on purpose: dropping it
 * would read a line a child QUOTED in its own output, and a false alarm here
 * ends a run. The census in censusVerdict() is what covers the miss, and an
 * announcement this reader missed is one that did not speak, so a session that
 * went during that launch stays a failure.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function announcedSockets(text) {
  const out = [];
  const re = new RegExp(ANNOUNCEMENT.source, 'gm');
  let m;
  while ((m = re.exec(String(text ?? ''))) !== null) out.push(m[1]);
  return out;
}

/**
 * The first socket the child announced, or null when it has announced none.
 *
 * @param {string} text
 * @returns {string|null}
 */
export function socketFromAnnouncement(text) {
  const all = announcedSockets(text);
  return all.length > 0 ? all[0] : null;
}

/**
 * Why the app's own answer disagrees with what this launch asked for, or null.
 * Layer 3's judgement, pure so the gate can drive it.
 *
 * Four combinations, and only one of them is a finding.
 *
 *   wanted is empty                  null. Nothing was asked for, so nothing is
 *                                    asserted, and the layer 2 warning has
 *                                    already said the app will use -L gmux.
 *   nothing announced                null. A launch that resolved no tmux
 *                                    context prints no line. THAT IS A STATED
 *                                    LIMIT: this layer asserts nothing about a
 *                                    launch that never reached the tmux layer,
 *                                    and layer 4's census is what covers it.
 *   every announcement matches       null.
 *   any announcement differs         a finding naming both names.
 *
 * @param {{wanted: string|null|undefined, announced: string|string[]|null}} input
 * @returns {string|null}
 */
export function announcementFinding(input) {
  const wanted = String(input?.wanted ?? '').trim();
  if (wanted === '') return null;
  const raw = input?.announced ?? null;
  const announced = (Array.isArray(raw) ? raw : raw === null ? [] : [raw])
    .map((s) => String(s).trim())
    .filter((s) => s !== '');
  if (announced.length === 0) return null;
  const wrong = announced.filter((s) => s !== wanted);
  if (wrong.length === 0) return null;
  return (
    `this launch asked the app to use the tmux socket "${wanted}" and the app ` +
    `itself answered "${wrong.join('", "')}". ` +
    (wrong.includes('gmux')
      ? 'That is the operator\'s live server, which is the exact failure ' +
        'this refusal exists to stop. '
      : '') +
    'The launch was ended. Read the app\'s own [gmux-socket] line to see what ' +
    'it decided and why.'
  );
}

// ---------------------------------------------------------------------------
// PHASE 285. Layer 4, read by identity.
// ---------------------------------------------------------------------------
/**
 * WHY LAYER 4 ASKS WHO MADE A SESSION RATHER THAN COUNTING THEM.
 *
 * Until Phase 285 layer 4 was a difference of session NAMES around one launch,
 * read only for a launch that named a scratch socket. It could not tell a
 * session the launch made from one the operator made, so his own work failed
 * probes by name: on 2026-09-17 `probe:p277` passed all four of its arms and
 * exited 1 because he had started a session of his own, and on 2026-09-20
 * `probe:p293` failed because he had removed `hotdog` in the sheet.
 *
 * THE RULE: a launch fails for what it could have done to his server, never
 * for what he did. The census reads one row per session, keyed by its `$-id`
 * together with its creation time (a server that restarts numbers its sessions
 * from `$0` again), around a launch that names a scratch socket and only
 * there, which is his allowance of 2026-11-02 as it reads (the fix round of
 * Phase 352 put the guard back: a launch that names none is not read, exactly
 * as before), and judges each session that APPEARED:
 *
 *   (a)  FAIL when its `@gmux-id` is in THIS launch's own scratch manifest,
 *        `<userDataDir>/gmux/manifest.db`, where a Tortie session's row is
 *        written before its spawn (src/main/sessions/create-local.ts).
 *   (a') FAIL when its start folder, as tmux reports it or resolved, is under
 *        this launch's scratch folder, in the `/tmp` and `/private/tmp`
 *        spellings and the `/var` and `/private/var` ones.
 *   (b)  FAIL when it carries no `@gmux-id` and still none ONE re-read at least
 *        a second later: a `new-session` aimed at the wrong socket, an app
 *        killed between its create and its stamp, or `gmux-control`, which is
 *        unstamped by design and which only an app ON that server makes.
 *   (c)  Otherwise an app that is not this launch stamped it, and it is the
 *        operator's own: a NOTE naming it, and the exit does not move.
 *
 * A session that WENT fails the launch, unless the app announced its socket at
 * least once and EVERY announcement named the scratch socket this launch asked
 * for. Then the app was never on his server, rule 5f of
 * build/assert-electron-teardown.mjs proves that no script importing this file
 * aims anything but `list-sessions` at it in an argv, and the end is his: a
 * NOTE. A launch whose app announced nothing keeps the failure, because "no
 * line" and "the right line" are two different worlds and only one of them
 * says anything.
 *
 * A RENAME IS JUDGED AS A SESSION THAT WENT IS (the fix round of Phase 352):
 * the same session under a new name is a note after an agreeing announcement
 * and a failure otherwise. Until then it was nothing, so a launch whose app
 * renamed one of his sessions went unseen where the parent's names diff
 * failed it.
 *
 * HIS SERVER RESTARTING, read as his (the fix round of Phase 352): after an
 * agreeing announcement, a session that appeared still unstamped and carries
 * the name of an unstamped session that WENT in the same launch is that
 * session again, which is `gmux-control` when his server restarts and his app
 * brings it back, and it is a note rather than (b)'s failure. Each one that
 * went answers for one that appeared. A launch whose announcement did not
 * agree keeps (b).
 *
 * A reading tmux could not answer and a row that does not read as one FAIL
 * CLOSED, and so does a stamped session that appeared while this launch's own
 * manifest could not be read: the census cannot tell this launch's sessions
 * from his then, and says exactly that.
 *
 * STATED LIMITS, each the safe direction or named here:
 *   - `gmux-control` appearing because HIS app started during a launch, with
 *     no `gmux-control` that went before it, fails that launch by (b). A
 *     probe's app pointed at his server makes it too, so it is what a probe
 *     could have done, and it stays fatal.
 *   - His app stamping a session more than about a second after the after-read
 *     (the re-read is CENSUS_REREAD_MS later) fails that launch by (b), as the
 *     parent's names diff failed it.
 *   - A session that went, a rename, and a session stamped by an app that is
 *     not this launch's are each read as his after an agreeing announcement,
 *     because the census cannot tell who did it; the parent's names diff
 *     failed all three. That rests on two things: the app said, every time it
 *     spoke, that it used the scratch socket, and rule 5f of
 *     build/assert-electron-teardown.mjs proves that no script importing this
 *     file aims anything but `list-sessions` at his server in an argv. 5f reads
 *     the pair `-L gmux` and the attached `-Lgmux`, a `-L` whose value is a
 *     name the script declares as `'gmux'`, a `+` of literals that makes it,
 *     and a `-S` whose path ends in `/gmux`. A socket name computed at run
 *     time, and a command line a script hands a shell, are not read by it.
 *   - The manifest read is THIS launch's scratch database, after the app is
 *     gone. His live manifest is never opened: it is his private session list,
 *     and a WAL database his running app owns.
 */

/**
 * The one format the census asks tmux for: five fields split by a TAB, the
 * start folder LAST because a folder may hold a tab and a session name never
 * does (3.6a stores a typed tab as the four characters `\t` and 3.7b refuses
 * the name, both measured for build/p352/SPEC.md §2.5). A client with no UTF-8
 * locale is sent every tab as `_`, which is why the reader passes `-u`.
 */
export const CENSUS_FORMAT =
  '#{session_id}\t#{@gmux-id}\t#{session_created}\t#{session_name}\t#{session_path}';

/** How long after the after-read an unstamped session that appeared is read again. */
export const CENSUS_REREAD_MS = 1000;

/** What tmux answers when no server is listening on the socket at all. */
const NO_SERVER =
  /^(?:no server running on |error connecting to .*\(No such file or directory\))/m;

/** A manifest session id, as `randomUUID` writes one. */
const MANIFEST_ID = /^[A-Za-z0-9-]{1,64}$/;

/**
 * One line of the census as a row, or null when it does not read as one: it
 * must split into five at its first four tabs, the folder taking the rest, and
 * its first field must be a `$-id`.
 *
 * @param {string} line
 * @returns {{id: string, gmuxId: string, created: string, name: string, path: string}|null}
 */
export function parseCensusLine(line) {
  const fields = [];
  let from = 0;
  for (let k = 0; k < 4; k += 1) {
    const at = String(line).indexOf('\t', from);
    if (at === -1) return null;
    fields.push(line.slice(from, at));
    from = at + 1;
  }
  const [id, gmuxId, created, name] = fields;
  if (!/^\$\d+$/.test(id)) return null;
  return { id, gmuxId, created, name, path: line.slice(from) };
}

/**
 * One `list-sessions` answer as a census reading, pure so the gate drives it.
 * No server listening is an empty server; anything else tmux could not answer
 * is `ok: false`, and every line that does not read as a row is kept, by its
 * exact text, in `unreadable`.
 *
 * @typedef {{ok: boolean, why: string|null, rows: object[], unreadable: string[]}} CensusReading
 * @param {{error?: Error, status?: number|null, stdout?: string, stderr?: string}} r
 * @returns {CensusReading}
 */
export function censusReading(r) {
  if (r?.error) {
    return {
      ok: false,
      why: `tmux could not be run (${String(r.error.code ?? r.error.message)})`,
      rows: [],
      unreadable: []
    };
  }
  if (r?.status !== 0) {
    const said = String(r?.stderr ?? '').trim();
    if (NO_SERVER.test(said)) return { ok: true, why: null, rows: [], unreadable: [] };
    return {
      ok: false,
      why: `tmux answered exit ${String(r?.status)}${said === '' ? '' : `: ${said.split('\n')[0].slice(0, 160)}`}`,
      rows: [],
      unreadable: []
    };
  }
  const rows = [];
  const unreadable = [];
  for (const line of String(r.stdout ?? '').split('\n')) {
    if (line === '') continue;
    const row = parseCensusLine(line);
    if (row === null) unreadable.push(line);
    else rows.push(row);
  }
  return { ok: true, why: null, rows, unreadable };
}

/**
 * The sessions on the operator's private server, read and never written.
 *
 * THIS IS THE ONLY PLACE IN THIS FILE THAT NAMES `-L gmux`, and `list-sessions`
 * is the only verb it may ever be given; `-u` is a client flag, which is what
 * keeps the format's tabs. Rule 5f of build/assert-electron-teardown.mjs
 * asserts exactly that over this file's own source and over every script that
 * imports it, with planted verbs to prove the scanner can fail.
 *
 * @returns {CensusReading}
 */
export function liveSessionRows() {
  return censusReading(
    spawnSync('tmux', ['-u', '-L', 'gmux', 'list-sessions', '-F', CENSUS_FORMAT], {
      encoding: 'utf8',
      timeout: 10_000
    })
  );
}

/**
 * The session NAMES on the operator's server, from the same one reader.
 * Nothing in this file asks it: build/p261/probe-p261-socket.mjs reads it
 * beside {@link censusFinding}, and both are kept for that probe.
 *
 * @returns {string[]}
 */
export function liveSessionNames() {
  return liveSessionRows().rows.map((row) => row.name);
}

/** realpath(3) of a path, or null when it does not resolve. */
function realPathOrNull(path) {
  try {
    return realpathSync.native(path);
  } catch {
    return null;
  }
}

/** True when a path names a directory. */
function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** A path and its other spelling: `/tmp` against `/private/tmp`, `/var` against `/private/var`. */
export function bothSpellings(path) {
  const out = [path];
  for (const [real, link] of [
    ['/private/tmp', '/tmp'],
    ['/private/var', '/var']
  ]) {
    if (path === real || path.startsWith(`${real}/`)) out.push(link + path.slice(real.length));
    else if (path === link || path.startsWith(`${link}/`)) out.push(real + path.slice(link.length));
  }
  return out;
}

/**
 * This launch's scratch folders, each in both spellings: the harness directory
 * its environment names, and the folder its profile sits in unless that is a
 * system temporary root, the person's home, or a folder above the home.
 *
 * @param {{harnessDir?: string, userDataDir: string, tmp?: string, home?: string}} where
 * @returns {string[]}
 */
export function scratchRootsFor({ harnessDir, userDataDir, tmp = tmpdir(), home = homedir() }) {
  const roots = new Set();
  const harness = String(harnessDir ?? '').trim();
  if (harness !== '') {
    const real = realPathOrNull(harness);
    if (real !== null && isDirectory(real)) roots.add(real);
  }
  if (typeof userDataDir === 'string' && userDataDir !== '') {
    const parent = realPathOrNull(dirname(resolve(userDataDir)));
    const temps = new Set(['/tmp', '/private/tmp', '/var/tmp', '/private/var/tmp', resolve(tmp)]);
    const realTmp = realPathOrNull(tmp);
    if (realTmp !== null) temps.add(realTmp);
    const realHome = realPathOrNull(home) ?? resolve(home);
    const aboveHome =
      parent !== null && `${realHome}/`.startsWith(parent === '/' ? '/' : `${parent}/`);
    if (parent !== null && !temps.has(parent) && !aboveHome) roots.add(parent);
  }
  return [...roots].flatMap(bothSpellings);
}

/**
 * This launch's own session ids, read from ITS scratch manifest once the app
 * is gone, and never from his: `refuseProfileReason` has already refused a
 * profile under his home. A file that is not there means this launch wrote no
 * session.
 *
 * @param {string} userDataDir
 * @returns {{exists: boolean, ok: boolean, ids: string[], why: string|null}}
 */
export function launchManifestIds(userDataDir) {
  const path = join(resolve(userDataDir), 'gmux', 'manifest.db');
  if (!existsSync(path)) return { exists: false, ok: true, ids: [], why: null };
  return manifestReading(
    spawnSync('/usr/bin/sqlite3', [path, 'SELECT id FROM sessions;'], {
      encoding: 'utf8',
      timeout: 10_000
    })
  );
}

/**
 * One `sqlite3` answer as this launch's session ids, pure so the gate drives
 * it. A read that failed, and a row that is not a session id, are a manifest
 * that could not be read.
 */
export function manifestReading(r) {
  const failed = (why) => ({ exists: true, ok: false, ids: [], why });
  if (r?.error) return failed(`sqlite3 could not be run (${String(r.error.code ?? r.error.message)})`);
  if (r?.status !== 0) {
    const said = String(r?.stderr ?? '').trim();
    return failed(`sqlite3 answered exit ${String(r?.status)}${said === '' ? '' : `: ${said.split('\n')[0].slice(0, 160)}`}`);
  }
  const ids = String(r.stdout ?? '')
    .split('\n')
    .filter((line) => line !== '');
  const bad = ids.find((id) => !MANIFEST_ID.test(id));
  if (bad !== undefined) return failed(`a row did not read as a session id: ${JSON.stringify(bad.slice(0, 80))}`);
  return { exists: true, ok: true, ids, why: null };
}

/** A session's identity across readings: its `$-id` and its creation time. */
const identityOf = (row) => `${row.id}\t${row.created}`;

/** How a session is named in a sentence. */
const namedRow = (row) => `${row.id} ${JSON.stringify(row.name)}`;

/** The scratch folder a session started under, as written or resolved, or null. */
function scratchRootHolding(row, roots) {
  for (const path of [row.path, row.resolved]) {
    if (typeof path !== 'string' || path === '') continue;
    const hit = roots.find((root) => path === root || path.startsWith(`${root}/`));
    if (hit !== undefined) return hit;
  }
  return null;
}

/**
 * Layer 4's judgement, pure so the gate drives it, every clause in the order
 * the section above states them.
 *
 * @param {{
 *   before: CensusReading|null,
 *   after: CensusReading|null,
 *   again?: CensusReading|null,
 *   manifest?: {exists: boolean, ok: boolean, ids: string[], why: string|null}|null,
 *   scratchRoots?: string[],
 *   wanted?: string,
 *   announced?: string[]
 * }} input  `again` is the one re-read, null when nothing asked for it, and
 *   `manifest` is this launch's own ids, null when nothing asked for them.
 * @returns {{failures: string[], notes: string[]}}
 */
export function censusVerdict(input) {
  const before = input?.before ?? null;
  const after = input?.after ?? null;
  const again = input?.again ?? null;
  const manifest = input?.manifest ?? null;
  const roots = (input?.scratchRoots ?? []).filter((r) => typeof r === 'string' && r !== '');
  const wanted = String(input?.wanted ?? '').trim();
  const announced = (input?.announced ?? [])
    .map((s) => String(s).trim())
    .filter((s) => s !== '');
  const failures = [];
  const notes = [];

  // A reading tmux could not answer cannot say what changed: it fails closed,
  // and alone, because every row of a reading that failed is a row it lost.
  for (const [when, reading, needed] of [
    ['before', before, true],
    ['after', after, true],
    ['a second after', again, false]
  ]) {
    if (reading === null) {
      if (needed) failures.push(`-L gmux was not read ${when} this launch, so nothing can be said about what it did there`);
      continue;
    }
    if (reading.ok !== true) {
      failures.push(`-L gmux could not be read ${when} this launch (${String(reading.why)}), so nothing can be said about what it did there`);
    }
  }
  if (failures.length > 0) return { failures, notes };

  // A row that does not read as one fails closed, unless the very same line
  // was already there before the launch.
  const knownLines = new Set(before?.unreadable ?? []);
  const strange = new Set();
  for (const reading of [after, again]) {
    for (const line of reading?.unreadable ?? []) if (!knownLines.has(line)) strange.add(line);
  }
  for (const line of strange) {
    failures.push(`a row of -L gmux did not read as a session (${JSON.stringify(line.slice(0, 160))}), so it cannot be told from one this launch made`);
  }

  const was = new Map((before?.rows ?? []).map((row) => [identityOf(row), row]));
  const now = new Map((after?.rows ?? []).map((row) => [identityOf(row), row]));
  const later = new Map((again?.rows ?? []).map((row) => [identityOf(row), row]));
  const own = new Set(manifest?.ok === true ? manifest.ids : []);
  const fresh = [...now.values()].filter((row) => !was.has(identityOf(row)));
  const went = [...was.values()].filter((row) => !now.has(identityOf(row)));

  // Whether the app said, every time it spoke, that it used the scratch socket
  // this launch asked for: what makes a session that went, a rename and his
  // server's restart his rather than this launch's.
  const spoke = announced.length > 0;
  const agreed = wanted !== '' && announced.every((s) => s === wanted);
  // The unstamped sessions that went, which his server restarting brings back
  // under the same name; each answers for one that appeared.
  const restorable = went.filter((row) => row.gmuxId === '');

  for (const row of fresh) {
    const reread = again === null ? undefined : later.get(identityOf(row));
    const stamp = row.gmuxId !== '' ? row.gmuxId : (reread?.gmuxId ?? '');
    // (a) this launch's own manifest holds its stamp.
    if (stamp !== '' && own.has(stamp)) {
      failures.push(`${namedRow(row)} APPEARED on -L gmux during this launch and its @gmux-id ${stamp} is in this launch's own manifest, so this launch made it`);
      continue;
    }
    // (a') it started under this launch's scratch folder.
    const root = scratchRootHolding(row, roots);
    if (root !== null) {
      failures.push(`${namedRow(row)} APPEARED on -L gmux during this launch and started under ${root}, this launch's own scratch folder, so this launch made it`);
      continue;
    }
    // His server restarting: still unstamped, after an agreeing announcement,
    // under the name of an unstamped session that went (the fix round of
    // Phase 352).
    const restored = stamp === '' && spoke && agreed ? restorable.findIndex((gone) => gone.name === row.name) : -1;
    if (restored !== -1) {
      const [gone] = restorable.splice(restored, 1);
      notes.push(`${namedRow(row)} appeared on -L gmux during this launch unstamped, under the name of ${namedRow(gone)}, which went, while the app said it used ${wanted} throughout: his server restarting, the operator's own`);
      continue;
    }
    // (b) still unstamped a second later.
    if (stamp === '') {
      failures.push(`${namedRow(row)} APPEARED on -L gmux during this launch with no @gmux-id and still had none a second later, so nothing can say whose it is`);
      continue;
    }
    // A stamp this launch's manifest could not be asked about.
    const readable = manifest !== null && (manifest.exists !== true || manifest.ok === true);
    if (!readable) {
      failures.push(`${namedRow(row)} APPEARED on -L gmux during this launch stamped ${stamp}, and this launch's own manifest could not be read (${String(manifest?.why ?? 'it was never asked')}), so this launch's sessions could not be told from his`);
      continue;
    }
    // (c) his own.
    notes.push(`${namedRow(row)} appeared on -L gmux during this launch, stamped ${stamp} by an app that is not this launch: the operator's own`);
  }

  // A session that went: his only when the app said, every time it spoke, that
  // it used the scratch socket this launch asked for.
  const said = !spoke
    ? 'the app never said which socket it used'
    : `the app said it used ${announced.join(', ')}${wanted === '' ? ' and this launch asked for none' : ` where this launch asked for ${wanted}`}`;
  for (const row of went) {
    if (spoke && agreed) {
      notes.push(`${namedRow(row)} went from -L gmux during this launch while the app said it used ${wanted} throughout: the operator's own`);
      continue;
    }
    failures.push(`${namedRow(row)} WENT from -L gmux during this launch and ${said}, so this launch may have ended it`);
  }

  // A rename: the same session under another name, judged as one that went is
  // (the fix round of Phase 352). It was nothing, which read a launch whose
  // app renamed one of his sessions as having done nothing at all.
  for (const [key, row] of now) {
    const old = was.get(key);
    if (old === undefined || old.name === row.name) continue;
    if (spoke && agreed) {
      notes.push(`${namedRow(old)} was renamed ${JSON.stringify(row.name)} on -L gmux during this launch while the app said it used ${wanted} throughout: the operator's own`);
      continue;
    }
    failures.push(`${namedRow(old)} was RENAMED ${JSON.stringify(row.name)} on -L gmux during this launch and ${said}, so this launch may have renamed it`);
  }
  return { failures, notes };
}

/**
 * Layer 4 after the teardown, in order: the after-read, ONE re-read a second
 * later when a session that appeared carries no stamp, this launch's own
 * manifest when a session that appeared is stamped, and the verdict. Every
 * effect is handed in, so the gate drives the whole order with readers of its
 * own and starts no tmux at all.
 *
 * @param {{
 *   before: CensusReading,
 *   read: () => CensusReading,
 *   manifest: () => {exists: boolean, ok: boolean, ids: string[], why: string|null},
 *   wait?: (ms: number) => Promise<void>,
 *   resolvePath?: (path: string) => string|null,
 *   scratchRoots?: string[],
 *   wanted?: string,
 *   announced?: string[]
 * }} input
 * @returns {Promise<{failures: string[], notes: string[]}>}
 */
export async function judgeCensus({
  before,
  read,
  manifest,
  wait = (ms) => new Promise((r) => setTimeout(r, ms)),
  resolvePath = realPathOrNull,
  scratchRoots = [],
  wanted = '',
  announced = []
}) {
  const was = new Set((before?.rows ?? []).map(identityOf));
  // Only a session that appeared is resolved: nothing else is judged.
  const resolved = (reading) => ({
    ...reading,
    rows: (reading?.rows ?? []).map((row) =>
      was.has(identityOf(row)) ? row : { ...row, resolved: resolvePath(row.path) }
    )
  });
  const after = resolved(read());
  const fresh = after.rows.filter((row) => !was.has(identityOf(row)));
  const again = fresh.some((row) => row.gmuxId === '')
    ? await wait(CENSUS_REREAD_MS).then(() => resolved(read()))
    : null;
  const stampedLater = new Set(
    (again?.rows ?? []).filter((row) => row.gmuxId !== '').map(identityOf)
  );
  const stamped = fresh.some((row) => row.gmuxId !== '' || stampedLater.has(identityOf(row)));
  return censusVerdict({
    before,
    after,
    again,
    manifest: stamped ? manifest() : null,
    scratchRoots,
    wanted,
    announced
  });
}

/** The failures of one verdict as the one sentence a launch is ended with. */
export function censusSentence(failures) {
  return (
    `${failures.join('; ')}. -L gmux is the private server the operator's live ` +
    `agent work runs on and a probe must never write to it. Read the app's ` +
    `own [gmux-socket] line to see which socket it decided on.`
  );
}

/**
 * The parent's judgement, a difference of session NAMES, or null when nothing
 * differs. withElectron no longer asks it: {@link censusVerdict} is layer 4
 * since Phase 285. It is kept, unchanged, for build/p261/probe-p261-socket.mjs,
 * whose own run reads it beside {@link liveSessionNames}.
 *
 * STATED LIMIT, and it is the reason Phase 285 replaced it: the operator
 * starting or ending a session by hand while a launch runs reads here as a
 * finding, loudly and by name.
 *
 * @param {string[]} before
 * @param {string[]} after
 * @returns {string|null}
 */
export function censusFinding(before, after) {
  const was = new Set(before ?? []);
  const now = new Set(after ?? []);
  const added = [...now].filter((n) => !was.has(n));
  const gone = [...was].filter((n) => !now.has(n));
  if (added.length === 0 && gone.length === 0) return null;
  const parts = [];
  if (added.length > 0) {
    parts.push(
      `${String(added.length)} session${added.length === 1 ? '' : 's'} ` +
        `APPEARED on -L gmux during this launch: ${added.join(', ')}`
    );
  }
  if (gone.length > 0) {
    parts.push(
      `${String(gone.length)} session${gone.length === 1 ? '' : 's'} ` +
        `WENT from -L gmux during this launch: ${gone.join(', ')}`
    );
  }
  return (
    `${parts.join('; ')}. -L gmux is the private server the operator's live ` +
    `agent work runs on and a probe must never write to it. Read the app's ` +
    `own [gmux-socket] line to see which socket it decided on.`
  );
}

// ---------------------------------------------------------------------------
// The teardown itself
// ---------------------------------------------------------------------------

/**
 * End one launch and everything it holds. Steps 1 to 6 of the header, in that
 * order. It is safe to call twice: the second call finds nothing alive and
 * reports zero.
 *
 * @param {object} entry the registry row for one launch
 * @param {number} graceMs how long SIGTERM is given before SIGKILL
 * @returns {Promise<number>} how many pids were signalled
 */
async function teardown(entry, graceMs) {
  if (entry.torn) return 0;
  entry.torn = true;
  const { pid } = entry;
  const before = pid > 0 ? descendants(pid) : [];

  // 1. SIGTERM the recorded pid. The shim forwards it. SIGKILL cannot be
  //    forwarded, so it is never the first signal here.
  if (pid > 0 && alive(pid)) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* already gone, which is the state we wanted */
    }
  }

  // 2. Wait for it, checking often so the ordinary case costs milliseconds.
  const deadline = Date.now() + graceMs;
  while (pid > 0 && alive(pid) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
  }

  // 3. The tree, read again now, unioned with the reading from before the
  //    signal so a child that reparented is still named.
  const after = pid > 0 ? descendants(pid) : [];
  const tree = [...new Set([...before, ...after, ...(pid > 0 ? [pid] : [])])];
  let killed = 0;
  for (const p of tree) {
    if (!alive(p)) continue;
    try {
      process.kill(p, 'SIGKILL');
      killed += 1;
    } catch {
      /* already gone, which is the state we wanted */
    }
  }

  // 4. The sweep by this launch's own profile path, which is what catches the
  //    crash handler and anything else that reparented before step 3 looked.
  for (const p of byProfilePath(entry.userDataDir)) {
    if (tree.includes(p)) continue;
    try {
      process.kill(p, 'SIGKILL');
      killed += 1;
    } catch {
      /* already gone */
    }
  }

  // 5. The pipes. Without this Node keeps a handle open and never exits.
  try {
    entry.child?.stdout?.destroy();
    entry.child?.stderr?.destroy();
    entry.child?.stdin?.destroy();
  } catch {
    /* nothing to destroy */
  }

  // 6. The scratch tmux server, when the caller named one.
  if (entry.tmuxSocket !== null) {
    spawnSync('tmux', ['-L', entry.tmuxSocket, 'kill-server'], {
      stdio: 'ignore'
    });
  }

  live.delete(entry.id);
  if (killed > 0) {
    console.error(
      `${TAG} ${entry.label}: ended ${String(killed)} process${killed === 1 ? '' : 'es'} the teardown found still running.`
    );
  }
  return killed;
}

/**
 * The same teardown with blocking calls only, for the `exit` event. Node runs
 * nothing asynchronous after that event, so the ordinary teardown above would
 * never finish. There is no grace period here, because there is no time to wait
 * one out. SIGTERM and SIGKILL go out together.
 */
function teardownSync(entry) {
  if (entry.torn) return 0;
  entry.torn = true;
  const { pid } = entry;
  const tree = pid > 0 ? [...descendants(pid), pid] : [];
  let killed = 0;
  for (const p of tree) {
    if (!alive(p)) continue;
    try {
      process.kill(p, 'SIGTERM');
    } catch {
      /* already gone */
    }
    try {
      process.kill(p, 'SIGKILL');
      killed += 1;
    } catch {
      /* already gone */
    }
  }
  for (const p of byProfilePath(entry.userDataDir)) {
    if (tree.includes(p)) continue;
    try {
      process.kill(p, 'SIGKILL');
      killed += 1;
    } catch {
      /* already gone */
    }
  }
  if (entry.tmuxSocket !== null) {
    spawnSync('tmux', ['-L', entry.tmuxSocket, 'kill-server'], {
      stdio: 'ignore'
    });
  }
  live.delete(entry.id);
  return killed;
}

/**
 * The safety net, installed once. A `finally` block does not run when the body
 * calls `process.exit`, and many probes end that way, so the registry is ended
 * on the way out however the process is leaving.
 */
function installNet() {
  if (netInstalled) return;
  netInstalled = true;
  process.on('exit', () => {
    for (const entry of [...live.values()]) {
      const killed = teardownSync(entry);
      if (killed > 0) {
        console.error(
          `${TAG} ${entry.label}: ended ${String(killed)} process${killed === 1 ? '' : 'es'} on the way out. The body called process.exit, so the finally block never ran.`
        );
      }
    }
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      for (const entry of [...live.values()]) teardownSync(entry);
      process.exit(1);
    });
  }
  process.on('uncaughtException', (err) => {
    console.error(`${TAG} uncaught: ${String(err?.stack ?? err)}`);
    for (const entry of [...live.values()]) teardownSync(entry);
    process.exit(1);
  });
  process.on('unhandledRejection', (err) => {
    console.error(`${TAG} unhandled rejection: ${String(err?.stack ?? err)}`);
    for (const entry of [...live.values()]) teardownSync(entry);
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// The two exports
// ---------------------------------------------------------------------------

/**
 * PHASE 200. The variables a development server leaves in a shell, and the one
 * helper that takes them out of a probe's Electron.
 *
 * `electron-vite dev` exports these, and `withElectron` merges `process.env`
 * into the child, so a probe run from the shell the operator's dev server is
 * running in measures the DEV renderer while a probe run from a clean shell
 * measures the BUILT one. The 0.98.0 audit hit exactly that: P167 needed an
 * explicitly sanitised launch before its numbers meant anything, so the same
 * command had two meanings depending on whose terminal it was typed in.
 *
 * A probe that measures the shipped renderer strips them, so its command has
 * one meaning. Node omits an environment key whose value is `undefined`, which
 * is what removes them from the child rather than blanking them.
 */
export const DEV_RENDERER_VARS = Object.freeze([
  'ELECTRON_RENDERER_URL',
  'NODE_ENV_ELECTRON_VITE',
  'NODE_ENV'
]);

/**
 * `env` with every development renderer variable removed from the child.
 *
 * @param {Record<string, string|undefined>} [env={}] the probe's own overrides
 * @returns {Record<string, string|undefined>} the same, plus the removals
 */
export function withoutDevRenderer(env = {}) {
  const out = { ...env };
  for (const name of DEV_RENDERER_VARS) out[name] = undefined;
  return out;
}

/**
 * The development renderer variables THIS process inherited, for a probe to
 * print. An empty list means the shell was already clean.
 *
 * @returns {string[]} the names that were set, in the order above
 */
export function inheritedDevRendererVars() {
  return DEV_RENDERER_VARS.filter(
    (name) => process.env[name] !== undefined && process.env[name] !== ''
  );
}

/**
 * @typedef {object} ElectronRunOptions
 * @property {string}   label          A short name for this launch. Every line
 *                                     the helper prints carries it.
 * @property {string}   userDataDir    Absolute path to this launch's own
 *                                     profile. Required. Refused when it is
 *                                     inside the repository or under the
 *                                     person's home.
 * @property {'shim'|'app'|'packaged'|string} [program='shim'] Which binary to
 *                                     start, or an absolute path of your own.
 * @property {string[]} [args=[]]      Arguments after the entry point.
 * @property {boolean}  [entry]        Whether to pass "." as the app path.
 *                                     Defaults to true for shim and app, and to
 *                                     false for packaged and for an absolute
 *                                     path of your own.
 * @property {boolean}  [persistence=true] Whether to add
 *                                     -ApplePersistenceIgnoreState YES.
 * @property {Record<string, string|undefined>} [env={}] Added on top of
 *                                     process.env.
 * @property {string}   [cwd]          Defaults to the repository root.
 * @property {number}   [graceMs=15000] How long SIGTERM is given before SIGKILL.
 * @property {string|null} [tmuxSocket=null] A scratch tmux socket to end in the
 *                                     same teardown. The names "gmux" and
 *                                     "default" are refused.
 * @property {boolean}  [echo=false]   Write the child's output to this process
 *                                     as it arrives. It is off by default
 *                                     because a probe that already prints its
 *                                     own report would otherwise print the
 *                                     app's log around it, and several probes
 *                                     are read by a parent script line by line.
 * @property {number}   [ceilingMs=300000] How long this launch may live.
 * @property {number}   [settleMs=500] How long to wait after the child exits
 *                                     before returning, so its last lines land.
 */

/**
 * @typedef {object} ElectronHandle
 * @property {import('node:child_process').ChildProcess} child
 * @property {number}  pid          The pid this call started. It is the SHIM's
 *                                  pid when program is "shim", and never the
 *                                  app's. Do not signal it by hand. The
 *                                  teardown is the only place that ends this
 *                                  launch.
 * @property {() => string} text    Everything the child has written so far.
 * @property {() => number} appPid  The pid that owns the window, being the
 *                                  first child of the shim, or the recorded pid
 *                                  itself when the program was not the shim.
 *                                  0 when it cannot be found.
 * @property {(pattern: RegExp|string, ms: number) => Promise<string>} waitForLine
 * @property {Promise<number>} exited Resolves with the exit code, or with
 *                                  1 when the launch never started.
 */

/**
 * @typedef {object} ElectronRunResult
 * @property {number}  code           The child's exit code, or 1 when it never
 *                                    started.
 * @property {string}  text           Everything the child wrote.
 * @property {number}  pid            The pid this call started.
 * @property {boolean} endedByCeiling True when ceilingMs ended it.
 * @property {number}  killed         How many pids the teardown signalled. 0 is
 *                                    the ordinary happy path.
 */

/**
 * Hold ONE Electron open, hand it to `body`, and end its whole process tree in
 * a `finally` block whatever `body` did. The value `body` returns is returned.
 *
 * @template T
 * @param {ElectronRunOptions} options
 * @param {(handle: ElectronHandle) => Promise<T>} body
 * @returns {Promise<T>}
 */
export async function withElectron(options, body) {
  const label = options?.label ?? 'electron';

  // PHASE 261, LAYER 2, AND IT IS FIRST ON PURPOSE. It is above the profile
  // refusal, above the program existence check, above the mkdir and above
  // installNet, so a launch in the wrong shape is refused before anything is
  // created and with no Electron on disk. That is also what lets rule 5 of
  // build/assert-electron-teardown.mjs drive the real withElectron rather than
  // a copy of its reasoning.
  const childEnv = { ...process.env, ...(options?.env ?? {}) };
  const socketWhy = socketRefusalReason(childEnv, options?.tmuxSocket ?? null);
  if (socketWhy !== null) throw new Error(`${TAG} ${label}: ${socketWhy}`);
  const wantedSocket = String(childEnv['GMUX_TMUX_SOCKET'] ?? '').trim();
  if (wantedSocket === '' && (options?.tmuxSocket ?? null) === null) {
    // Not a refusal. A launch that starts no tmux of its own is legitimate,
    // and refusing it would break every probe that opens no project. What is
    // NOT legitimate is doing that silently, so the effect is said out loud
    // and layer 4's census is what would catch it if it were wrong.
    console.error(
      `${TAG} ${label}: this launch names no tmux socket, so the app will ` +
        `use -L gmux if it resolves a tmux context at all.`
    );
  }

  const why = refuseProfileReason(options?.userDataDir);
  if (why !== null) throw new Error(`${TAG} ${label}: ${why}`);
  const userDataDir = resolve(options.userDataDir);
  const tmuxSocket = options.tmuxSocket ?? null;
  if (tmuxSocket !== null) {
    const bad = refuseSocketReason(tmuxSocket);
    if (bad !== null) throw new Error(`${TAG} ${label}: ${bad}`);
  }
  const program = options.program ?? 'shim';
  const bin = programPath(program);
  if (!existsSync(bin)) {
    throw new Error(
      `${TAG} ${label}: ${bin} is not there. Run the build, or the package for a packaged launch.`
    );
  }
  const wantsEntry =
    options.entry ?? (program === 'shim' || program === 'app');
  const argv = [];
  if (wantsEntry) argv.push('.');
  argv.push(`--user-data-dir=${userDataDir}`);
  if (options.persistence !== false)
    argv.push('-ApplePersistenceIgnoreState', 'YES');
  argv.push(...(options.args ?? []));

  mkdirSync(userDataDir, { recursive: true });
  installNet();

  // PHASE 261, LAYER 4. The operator's own ritual, made mechanical. It is read
  // only when this launch asked for a scratch socket, because that is the
  // launch that has something to prove: it declared where its tmux work goes,
  // so nothing of its making may appear anywhere else. His allowance of
  // 2026-11-02 is that read, around a launch that names `tmuxSocket`, and the
  // fix round of Phase 352 kept it there rather than widening it to every
  // launch. Still the one read-only `list-sessions`, from the one reader, and
  // since Phase 285 judged after the teardown by who made each session rather
  // than by how many there are.
  const censusBefore = tmuxSocket !== null ? liveSessionRows() : null;

  const entry = {
    id: nextLaunchId++,
    label,
    pid: 0,
    child: null,
    userDataDir,
    tmuxSocket,
    torn: false
  };
  live.set(entry.id, entry);

  let text = '';
  const waiters = [];
  let exitedResolve = null;
  const exited = new Promise((r) => {
    exitedResolve = r;
  });

  // PHASE 261, LAYER 3. The app announces the socket it really chose, and this
  // promise is how a disagreement reaches the caller. It can only ever reject,
  // it is raced against the body below so the body is not waited out, and the
  // finally block ends the launch either way. The catch here is what stops an
  // unhandled rejection when the body wins the race instead.
  let bodyError = null;
  let announcementReject = null;
  let announcementRejected = false;
  let seenAnnouncements = 0;
  const announcementFailed = new Promise((_res, rej) => {
    announcementReject = rej;
  });
  announcementFailed.catch(() => undefined);

  try {
    const child = spawn(bin, argv, {
      cwd: options.cwd ?? repoRoot,
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    entry.child = child;
    entry.pid = child.pid ?? 0;

    const onText = (b) => {
      const s = b.toString();
      text += s;
      if (options.echo === true) process.stdout.write(s);
      // Layer 3's reading. It is asked of the ACCUMULATED text rather than of
      // this chunk, because the line can arrive split across two chunks, and it
      // only re-reads when the tag is present at all, so an app that never
      // prints it costs one indexOf per chunk.
      if (
        wantedSocket !== '' &&
        !announcementRejected &&
        text.includes('[gmux-socket]')
      ) {
        const all = announcedSockets(text);
        if (all.length > seenAnnouncements) {
          seenAnnouncements = all.length;
          const finding = announcementFinding({
            wanted: wantedSocket,
            announced: all
          });
          if (finding !== null) {
            announcementRejected = true;
            announcementReject?.(new Error(`${TAG} ${label}: ${finding}`));
          }
        }
      }
      for (const w of [...waiters]) {
        if (w.test(text)) {
          waiters.splice(waiters.indexOf(w), 1);
          w.resolve(text);
        }
      }
    };
    child.stdout.on('data', onText);
    child.stderr.on('data', onText);
    child.on('error', (err) => {
      console.error(`${TAG} ${label}: electron could not start: ${err.message}`);
      exitedResolve?.(1);
    });
    child.on('exit', (code) => {
      exitedResolve?.(code ?? 1);
    });

    const handle = {
      child,
      pid: entry.pid,
      text: () => text,
      appPid: () => {
        if (program !== 'shim') return entry.pid;
        const kids = descendants(entry.pid);
        return kids.length > 0 ? kids[0] : 0;
      },
      waitForLine: (pattern, ms) =>
        new Promise((resolveLine, rejectLine) => {
          const re =
            pattern instanceof RegExp ? pattern : new RegExp(String(pattern));
          const test = (t) => re.test(t);
          if (test(text)) {
            resolveLine(text);
            return;
          }
          const w = {
            test,
            resolve: (t) => {
              clearTimeout(timer);
              resolveLine(t);
            }
          };
          const timer = setTimeout(() => {
            const at = waiters.indexOf(w);
            if (at !== -1) waiters.splice(at, 1);
            rejectLine(
              new Error(
                `${TAG} ${label}: nothing matched ${String(re)} in ${String(ms)} ms.`
              )
            );
          }, ms);
          waiters.push(w);
        }),
      exited
    };

    // The body is held in a name and given a catch of its own, so that when
    // the announcement wins the race the body's OWN later rejection — a
    // waitForLine that times out because the teardown just ended the child — is
    // already handled and cannot reach the unhandledRejection net and print
    // over the message that actually explains the run. The race still sees the
    // body's rejection when the body loses, because that catch is on a derived
    // promise rather than on this one.
    const bodyPromise = body(handle);
    bodyPromise.catch(() => undefined);
    return await Promise.race([bodyPromise, announcementFailed]);
  } catch (err) {
    bodyError = err;
    throw err;
  } finally {
    // Whatever happened above, the Electron this call started is ended here,
    // together with every process descended from it, every process naming this
    // launch's own scratch profile, and the scratch tmux server when one was
    // named. This block is the reason this file exists.
    await teardown(entry, options.graceMs ?? 15_000);

    // PHASE 261, LAYER 4, the other half, judged by identity since Phase 285.
    // It is AFTER the teardown, because a session the app made is only
    // certainly there once the app is certainly gone. A failure is THROWN when
    // the body returned normally and PRINTED when the body already threw, so
    // the census can never mask the body's own error, which is the more
    // informative of the two. A note is printed and moves no exit. A judgement
    // that itself throws is a failure, so the census fails closed. A launch
    // that named no scratch socket was not read before, and is not read now.
    if (censusBefore !== null) {
      let census;
      try {
        census = await judgeCensus({
          before: censusBefore,
          read: liveSessionRows,
          manifest: () => launchManifestIds(userDataDir),
          scratchRoots: scratchRootsFor({ harnessDir: childEnv['GMUX_HARNESS_DIR'], userDataDir }),
          wanted: wantedSocket,
          announced: announcedSockets(text)
        });
      } catch (err) {
        census = {
          failures: [`the census could not be judged (${String(err?.message ?? err)})`],
          notes: []
        };
      }
      for (const note of census.notes) console.error(`${TAG} ${label}: note: ${note}.`);
      if (census.failures.length > 0) {
        const finding = censusSentence(census.failures);
        if (bodyError !== null) {
          console.error(`${TAG} ${label}: ${finding}`);
        } else {
          throw new Error(`${TAG} ${label}: ${finding}`);
        }
      }
    }
  }
}

/**
 * Launch ONE Electron, wait for it to quit on its own, and end its whole
 * process tree whatever happened. This is withElectron with a body that only
 * awaits the exit, and it is what a photograph run wants.
 *
 * @param {ElectronRunOptions} options
 * @returns {Promise<ElectronRunResult>}
 */
export async function runElectron(options) {
  const ceilingMs = options?.ceilingMs ?? 300_000;
  const settleMs = options?.settleMs ?? 500;
  const out = { code: 1, text: '', pid: 0, endedByCeiling: false, killed: 0 };
  await withElectron(options, async (handle) => {
    out.pid = handle.pid;
    const code = await new Promise((r) => {
      const ceiling = setTimeout(() => {
        out.endedByCeiling = true;
        console.error(
          `${TAG} ${options.label ?? 'electron'}: passed its ceiling of ${String(ceilingMs)} ms. The teardown is ending the tree I started.`
        );
        r(1);
      }, ceilingMs);
      void handle.exited.then((c) => {
        clearTimeout(ceiling);
        setTimeout(() => {
          r(c);
        }, settleMs);
      });
    });
    out.code = code;
    out.text = handle.text();
    return code;
  });
  return out;
}
