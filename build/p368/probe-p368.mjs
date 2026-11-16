#!/usr/bin/env node
/**
 * probe-p368.mjs. THE PHASE 368 APP RUN, at the parent and at HEAD
 * (build/p368/SPEC.md §8; GitHub issue 44, research 145).
 *
 * ## What it proves, and why it has to be a run
 *
 * Issue 44 is three things a person meets in a real window: a long agent reply
 * drawn over itself, a copy that holds what is not drawn or breaks what tmux
 * joins, and links an agent prints that do nothing. Each fix lives where a unit
 * test cannot see the whole of it: the size a tmux client is spawned at, the
 * size a session is made at, the widths xterm counts, the text Copy writes and
 * the address a click hands main. So this script drives the real app twice,
 * THE PARENT FIRST (the parent measurement is mandatory: the operator relayed
 * a person's report), then HEAD, one Electron at a time, and grades both with
 * build/p368/graders.mjs, which derives every expected value itself.
 *
 * No agent runs and no token is spent. The `claude` and `codex` rows resolve to
 * build/p368/stand-in.mjs on a scratch login PATH, which either watches its own
 * size or writes research 145's recordings of real Claude Code 2.1.325 and
 * Codex 0.167.1 (redacted, build/fixtures/p368/) back at their recorded times.
 *
 * ## The arms (SPEC §8's table)
 *
 *   a  main's `sessions:resize` handler held back 15 ms and 30 ms, four
 *      returns to a session each: the parent's program meets 80 by 24, HEAD's
 *      never does, and HEAD's client attaches at the fitted size.
 *   b  a new claude session and a restored one start at the fitted size with no
 *      later size; a restored Claude (research 145's cold1 shape: it paints at
 *      its start size and repaints once on a different size) leaves no item
 *      twice.
 *   c  the spec step's census of every surface (tab and project returns, the
 *      sidebar, the editor, the orientation, the sheets, Catch Me Up, focus,
 *      zoom, a 50-step window drag, 8 and 60 ms transients, a split, a session
 *      ended under the visible one, a restore, full screen) and the first mount
 *      of a launch with JetBrains Mono chosen before it: every row equal to the
 *      parent's but the new session, the restore and the first mount.
 *   d  Claude's and Codex's emoji replies replayed, and a reply of each with no
 *      emoji as the floor: the terminal's visible rows against `capture-pane
 *      -p` at up to 30 marks where the replay stops between two frames, CELL
 *      BY CELL since the fix round (tmux's text placed where tmux draws it, by
 *      the committed widths and the seven joining rules, graders.mjs), so a
 *      row drawn one column off counts. Then the same in a second launch whose
 *      server is Homebrew's 3.6a, where the parent leaves letters in the gaps.
 *   e  a Claude pane narrowed 120 to 96 then copied (⌘A ⌘C, and the Edit
 *      menu's Copy as a DOM copy event the probe owns); Codex's terminal-wrapped
 *      URL and a long shell line copied while scrolled back (a drag that does
 *      not scroll, ⌘A, a double and a triple click), each of which must copy
 *      exactly what the parent copies, line ends trimmed, since the fix round
 *      took item 7 back out; the reporter's command, which Claude breaks
 *      itself, copied at a steady width.
 *   f  Claude's and Codex's linked replies replayed: the links xterm holds, a
 *      hover and a click on every link word and every drawn address on the
 *      final screen, and research 145 §5.5's hostile targets under words that
 *      hold no address; and since the fix round, a project file's name linked
 *      to a web page (the file must open in the editor, with no address handed
 *      to main, at both builds) and two links cut at the pane's edge, one whose
 *      target is not what its rows draw and one honest, each clicked on both
 *      its rows.
 *   RUN  his shell history before and after, the crash reports added (by name
 *      only), the helper's census of his sessions around every launch, the
 *      run's own socket answering nothing at the end, and no process naming a
 *      profile of this run.
 *
 * ## How it reads, and the four places it departs from the SPEC's wording
 *
 * - "What the program saw" is the stand-in's own log (its start size, every
 *   SIGWINCH, a 1 ms poll); "what the server was told" is a `client-resized`,
 *   `client-attached` and `client-detached` hook on the scratch server. Both
 *   are attributed to a step by the logs' ORDER, their lengths read at each
 *   step's boundary, never by a clock: a hook runs a shell and perl, so its
 *   stamp lands 100 to 200 ms after the event, and this process drifts tens of
 *   milliseconds from one started minutes later. Two parent censuses graded
 *   against each other read 53 of 53 rows equal.
 * - A restore recreates a session as `$SHELL` with no arguments and types the
 *   resume into it (src/main/restore/restore.ts), so the app's SHELL is a
 *   wrapper that runs the stand-in for exactly that start and /bin/sh for every
 *   other (the login shell probe, a shell session). The restore is made OFF
 *   SCREEN, from the second project, and shown once its program has started:
 *   the order an agent's real start gives, which a stand-in that starts in
 *   milliseconds would otherwise race. Arm b's restore goes through the store's
 *   own verb (every Restore control's funnel); the cold1 replay through the
 *   bridge's `sessions.restore`, which the SPEC names (main's fallback size).
 * - The SPEC's arm e narrows 140 to 96; the fixtures hold Claude's replies at
 *   120 columns only (the 140-column recording would take the fixtures past
 *   600 KB and names a home folder in its own text), so this narrows 120 to 96,
 *   the same mechanism: xterm keeps the cells of a row past a narrowed width
 *   and a copy that reads a row to its length carries them. The URL and the
 *   long line are copied once they have gone up into the history and come back
 *   into view drawn by the scrollback (research 145 §4.3's case): a view moved
 *   by a few lines carries its rows' wrap marks with it.
 * - Arm f grades the hostile targets by D14's text: a look-alike host, a bidi
 *   override in a path, `https:` with no slashes, backslashes and a zero-width
 *   joiner in a host all parse as https with no user part, so D14 offers them
 *   while §4.5 and §8 call them refused. Either is safe so long as a click
 *   opens exactly the target or nothing and the hover shows `new URL(t).href`
 *   whenever it opens, so either passes and the report names which happened
 *   (graders.mjs HOSTILE_EITHER). A user part, more than 2,048 bytes, and every
 *   scheme but http and https must open nothing.
 *
 * ## A CLICK NEVER REACHES HIS BROWSER, A COPY NEVER TOUCHES HIS PASTEBOARD
 *
 * Main is opened with `--inspect=0`, and before anything is clicked or copied
 * this replaces, in MAIN: `shell.openExternal`, `shell.openPath` and
 * `shell.showItemInFolder` with recorders that open nothing; Electron's
 * `clipboard` writers with recorders; and the `clipboard:writeRich` invoke
 * handler (the channel every Copy writes through; the SPEC calls it
 * `capture:writeRich`) with a recorder that does not call the original. A
 * click is graded by what main was handed, which is the decision under test.
 * The page's `window.confirm` answers no and `navigator.clipboard` records.
 * Keys go through CDP with no editing command, so no native copy runs, and the
 * Edit menu's Copy is a synthetic `copy` event carrying a DataTransfer the
 * probe owns. If a recorder could not be put in place, nothing is clicked.
 *
 * ## What it refuses, exit 2 as UNREADABLE rather than pass what it never saw
 *
 * A socket that is not a scratch `gmux-…` one; a checkout without
 * `out/main/index.js`; the parent missing (`P368_PARENT_CHECKOUT`, unless
 * `P368_HEAD_ONLY=1`, which runs HEAD alone and still exits 2) or equal to
 * HEAD; a fixture under build/fixtures/p368/ that breaks the redaction rules;
 * a build whose own overlay parser does not hide every probed row but claude
 * and codex, or an `agents:list` read back that resolves anything but the two
 * stand-ins under this run's folder (checked before any arm); a stand-in that
 * never started; a replay that never reached its marks. An arm that could not
 * be read is never a pass.
 *
 * ## SAFETY
 *
 * Every Electron goes through build/electron-run.mjs's `withElectron` (its
 * `finally` ends the tree it started and the scratch tmux server it was
 * named), inside build/harness-socket.mjs, on a scratch profile, HOME and
 * login PATH per launch under `GMUX_HARNESS_DIR`, with
 * `--inspect=0 --remote-debugging-port=0 --use-mock-keychain` and the three
 * background flags, every Claude Code, tmux and terminal variable this process
 * inherited stripped, and the run's own socket handed in so the helper's census
 * is the one read of his server. Every other process this script starts is
 * synchronous and exits before its call returns: tmux commands on the scratch
 * socket, `/bin/ps`, and the pinned tsx of the hidden-agents precheck. The
 * stand-ins run inside the scratch server's panes and end with it. It reads
 * his shell history files' size and modification time only, and the crash
 * reports folder by name and modification time only.
 *
 * Keep a `tmux` on this process's own PATH (Homebrew's is fine; never the
 * app's): build/electron-run.mjs's census of his sessions runs `tmux`, and a
 * census that could not run it reads UNREAD, never a pass (the fix round).
 *
 *   P368_PARENT_CHECKOUT=/path/to/built/parent npm run probe:p368
 *   P368_ARMS=a,c ...          named arms only (RUN is always read)
 *   P368_KEEP=1 ...            keep the scratch worlds (stand-in logs, hook logs)
 *   P368_TMUX_36A=/path/tmux   the 3.6a for arm d's second launch (default /opt/homebrew/bin/tmux)
 *   P368_REPORT=/path.json     the report, outside this checkout (default beside the harness folder)
 *   P368_HEAD_ONLY=1           HEAD alone, a dry run: its readings are printed, it exits 2
 *   P368_HEAD_CHECKOUT=/path   a built checkout to launch as HEAD instead of this one (development)
 *   node build/p368/probe-p368.mjs --grader-self-test   the graders over fixtures, starts nothing
 *
 * Exit 0 when every arm reads as HEAD must, 1 on a finding, 2 when an arm
 * could not be read.
 */

import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import * as hidden from '../hidden-agents.mjs';
import * as G from './graders.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p368]';
const J = JSON.stringify;
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => performance.timeOrigin + performance.now();
const FIXTURE_DIR = join(ROOT, 'build', 'fixtures', 'p368');
const GRADER_DIR = join(ROOT, 'build', 'p368', 'fixtures', 'graders');
const STAND_IN = join(ROOT, 'build', 'p368', 'stand-in.mjs');

// ---------------------------------------------------------------------------
// The graders over recorded readings: starts nothing.
// ---------------------------------------------------------------------------

function loadFixtures() {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const text = readFileSync(join(FIXTURE_DIR, f), 'utf8');
      return { name: f.slice(0, -5), fixture: JSON.parse(text), bytes: Buffer.byteLength(text) };
    });
}

if (process.argv.includes('--grader-self-test')) {
  const cases = readdirSync(GRADER_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(GRADER_DIR, f), 'utf8')));
  const widths = JSON.parse(readFileSync(join(ROOT, 'build', 'fixtures', 'screen', 'tmux-widths.json'), 'utf8'));
  const r = G.selfTest(cases, loadFixtures(), widths);
  for (const l of r.said) console.log(`${TAG} --grader-self-test ${l}`);
  process.exit(r.ok ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The refusals, before anything is created.
// ---------------------------------------------------------------------------

class Unreadable extends Error {}
class Fatal extends Error {}
function refuse(why) {
  console.error(`${TAG} UNREADABLE: ${why}`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(process.execPath, [join(ROOT, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p368', `node ${process.argv[1]}`], { cwd: ROOT, stdio: 'inherit' });
  process.exit(w.status ?? 2);
}
if (socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-')) refuse(`refusing the socket ${J(socket)}: not a scratch socket.`);
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('no GMUX_HARNESS_DIR. Run me through build/harness-socket.mjs.');

const realOr = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};
const insideOf = (p, dir) => p === dir || p.startsWith(`${dir}${sep}`);
const built = (d) => existsSync(join(d, 'out', 'main', 'index.js'));
const HEAD_DIR = realOr((process.env['P368_HEAD_CHECKOUT'] ?? '').trim() || ROOT);
const PARENT_RAW = (process.env['P368_PARENT_CHECKOUT'] ?? '').trim();
const PARENT_DIR = PARENT_RAW === '' ? '' : realOr(PARENT_RAW);
const HEAD_ONLY = (process.env['P368_HEAD_ONLY'] ?? '') === '1';
if (PARENT_DIR === '' && !HEAD_ONLY) refuse('P368_PARENT_CHECKOUT names no checkout. Point it at a BUILT checkout of the phase parent (8497c34c); the parent measurement is mandatory. P368_HEAD_ONLY=1 runs HEAD alone and still exits 2.');
if (PARENT_DIR !== '' && PARENT_DIR === HEAD_DIR) refuse('P368_PARENT_CHECKOUT is HEAD. The parent must be a separate built checkout of the phase parent.');
for (const d of [HEAD_DIR, ...(PARENT_DIR === '' ? [] : [PARENT_DIR])]) if (!built(d)) refuse(`${d} has no out/main/index.js. Build it first (npm run build).`);

const ALL_ARMS = G.ARMS;
const armsRaw = (process.env['P368_ARMS'] ?? '').trim();
const ASKED = armsRaw === '' ? [...ALL_ARMS] : armsRaw.split(',').map((s) => s.trim()).filter(Boolean);
const badArms = ASKED.filter((a) => !ALL_ARMS.includes(a));
if (badArms.length > 0) refuse(`P368_ARMS names ${badArms.join(', ')}, which is no arm (${ALL_ARMS.join(', ')}).`);
const want = (arm) => ASKED.includes(arm);
const KEEP = (process.env['P368_KEEP'] ?? '') === '1';
const TMUX_36A = (process.env['P368_TMUX_36A'] ?? '').trim() || '/opt/homebrew/bin/tmux';

mkdirSync(harnessDir, { recursive: true });
const HARNESS = realOr(harnessDir);
const SCRATCH = join(HARNESS, 'p368');
const REPORT_PATH = resolve((process.env['P368_REPORT'] ?? '').trim() || `${HARNESS}-probe-p368.json`);
if (insideOf(REPORT_PATH, realOr(ROOT)) || insideOf(REPORT_PATH, HEAD_DIR)) refuse(`P368_REPORT (${REPORT_PATH}) must sit outside the checkout.`);
if (!KEEP && insideOf(REPORT_PATH, SCRATCH)) refuse(`P368_REPORT (${REPORT_PATH}) sits inside the scratch directory, which is removed at the end.`);

// The recordings, read and held to the redaction rules before anything starts.
const FIXTURES = Object.fromEntries(loadFixtures().map((f) => [f.name, f]));
for (const name of G.FIXTURE_NAMES) {
  if (FIXTURES[name] === undefined) refuse(`build/fixtures/p368/${name}.json is missing.`);
  const problems = G.fixtureProblems(FIXTURES[name].fixture, name);
  if (problems.length > 0) refuse(`build/fixtures/p368/${name}.json: ${problems.join('; ')}`);
}
const fixturePath = (name) => join(FIXTURE_DIR, `${name}.json`);

/** Every Claude Code, terminal, tmux and token variable this process inherited, REMOVED from what it starts. */
const STRIPPED = Object.fromEntries(
  Object.keys(process.env)
    .filter((n) => /^(?:CLAUDECODE|CLAUDE_|NVM_|TERM_PROGRAM|TERM_SESSION_ID|ITERM|SSH_AUTH_SOCK|SSH_AGENT|GH_TOKEN|GITHUB_TOKEN|TMUX|OPENAI|ANTHROPIC)/.test(n) || ['ZDOTDIR', 'HISTFILE', 'GMUX_CONFIG_ROOT', 'TMUX_TMPDIR', 'GMUX_TMUX_BIN'].includes(n))
    .map((n) => [n, undefined])
);
const TMUX_ENV = (() => {
  const e = { ...process.env, LANG: 'en_US.UTF-8', LC_CTYPE: 'en_US.UTF-8' };
  for (const n of Object.keys(STRIPPED)) delete e[n];
  return e;
})();

// ---------------------------------------------------------------------------
// The recordings: frame boundaries, marks and the links they send.
// ---------------------------------------------------------------------------

/** The chunk indices after which the stream is outside a synchronized frame. */
function quietBoundaries(fixture) {
  const out = [];
  let open = false;
  fixture.chunks.forEach((c, i) => {
    const s = Buffer.from(c.b, 'base64').toString('latin1');
    for (const m of s.matchAll(/\x1b\[\?2026([hl])/g)) open = m[1] === 'h';
    if (!open) out.push(i);
  });
  return out;
}
/** `n` marks spread evenly over the quiet boundaries, skipping the first few chunks. */
function spreadMarks(fixture, n) {
  const q = quietBoundaries(fixture).filter((i) => i >= 3 && i < fixture.chunks.length - 1);
  if (q.length <= n) return q;
  const out = [];
  for (let k = 0; k < n; k += 1) out.push(q[Math.round(((k + 0.5) * q.length) / n - 0.5)]);
  return [...new Set(out)];
}
/** The OSC 8 links a recording sends: [{ target, words }], the words with cursor jumps read as spaces. */
function oscLinks(fixture) {
  const text = Buffer.concat(fixture.chunks.map((c) => Buffer.from(c.b, 'base64'))).toString('utf8');
  const out = [];
  const seen = new Set();
  const re = /\x1b\]8;[^;\x07\x1b]*;([^\x07\x1b]*)(?:\x07|\x1b\\)/g;
  let m;
  let open = null;
  while ((m = re.exec(text)) !== null) {
    if (open !== null) {
      const raw = text.slice(open.end, m.index);
      const words = raw
        .replace(/\x1b\[\d*[GC]/g, ' ')
        .replace(/\x1b\[[0-9;?<>=]*[ -/]*[@-~]/g, '')
        .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const key = `${open.target}\u0000${words}`;
      if (words !== '' && !seen.has(key)) {
        seen.add(key);
        out.push({ target: open.target, words });
      }
      open = null;
    }
    if (m[1] !== '') open = { target: m[1], end: m.index + m[0].length };
  }
  return out;
}

const ESC = '\x1b';
const ST = '\x1b\\';
const osc8 = (target, words) => `${ESC}]8;;${target}${ST}${words}${ESC}]8;;${ST}`;
/** Research 145 §5.5's hostile targets and SPEC §4.5's refusals, each under words that hold no address. */
export const HOSTILE = Object.freeze([
  ['bidi', 'https://example.com/‮gpj.exe', 'download now'],
  ['homograph', 'https://аpple.com/', 'apple store'],
  ['userinfo', 'https://www.google.com@evil.example/', 'google search'],
  ['nohost', 'https:example.com/x', 'no slashes'],
  ['backslash', 'https:\\\\evil.example\\x', 'backslashes here'],
  ['zerowidth', 'https://exa​mple.com/', 'zero width'],
  ['long3000', `https://example.com/${'x'.repeat(2980)}`, 'long target'],
  ['long65536', `https://example.com/${'y'.repeat(65516)}`, 'huge target'],
  ['javascript', 'javascript:alert(1)', 'run this'],
  ['data', 'data:text/html,<b>hi</b>', 'data page'],
  ['file', 'file:///etc/hosts', 'hosts file'],
  ['vscode', 'vscode://file/private/var/tmp/x.txt', 'open in editor'],
  ['localhost', 'http://localhost:3000/', 'dev server']
]);
/**
 * The fix round's rows (both lenses, 2026-11-16), drawn after the hostile targets at 120 columns: a project
 * file's name an agent linked to a web page (README.md is written into the project), and two links cut at
 * the pane's edge, one whose target is not what its rows draw and one that is honest. Each cut row's first
 * part ends in the row's last cell, as Claude cuts a long address.
 */
const CUT_COLS = 120;
const FIX_ROWS_LINES = [
  `${G.PATH_WORD.key}: ${osc8(G.PATH_WORD.target, G.PATH_WORD.words)}`,
  ...G.CUT_ROWS.flatMap(({ key, target, first, second }) => [`${key}:${' '.repeat(CUT_COLS - key.length - 1 - first.length)}${osc8(target, first)}`, osc8(target, second)])
];
const HOSTILE_LINES = ['p368 hostile link targets, each under words that hold no address:', ...HOSTILE.map(([key, target, words]) => `${key}: ${osc8(target, words)}`), ...FIX_ROWS_LINES];
// Lines before it and after it, so the long line ends up in the pane's history and comes back into view
// drawn by the scrollback, which is where research 145 §4.3 found a copy losing tmux's wraps.
const SHELL_LINES = [...Array.from({ length: 40 }, (_, i) => `p368 filler line ${String(i + 1)}`), G.E_SHELL_LINE, ...Array.from({ length: 40 }, (_, i) => `p368 after line ${String(i + 1)}`)];
/** What the Codex pane is given after its reply, so the reply's rows go up into the history. */
const TAIL_LINES = Array.from({ length: 48 }, (_, i) => `p368 tail line ${String(i + 1)}`);

// ---------------------------------------------------------------------------
// One scratch world per launch: HOME, login PATH, stand-ins, hooks, profile.
// ---------------------------------------------------------------------------

function makeWorld(build, kind) {
  const root = join(SCRATCH, `${build}-${kind}`);
  rmSync(root, { recursive: true, force: true });
  const w = {
    root,
    home: join(root, 'h'),
    bin: join(root, 'bin'),
    ctl: join(root, 'c'),
    profile: join(root, 'p'),
    proj1: join(root, 'proj1'),
    proj2: join(root, 'proj2'),
    proj3: join(root, 'proj3'),
    hookLog: join(root, 'hooks.log')
  };
  for (const d of [w.home, w.bin, w.ctl, w.profile, w.proj1, w.proj2, w.proj3]) mkdirSync(d, { recursive: true });
  w.root = realOr(root);
  for (const key of ['home', 'bin', 'ctl', 'profile', 'proj1', 'proj2', 'proj3']) w[key] = realOr(w[key]);
  // The fix round: the file arm f's linked name names, in the project its hostile session runs in.
  writeFileSync(join(w.proj3, G.PATH_WORD.words), '# p368\n\nThe file a click on its linked name opens in the editor.\n');
  w.plan = join(w.ctl, 'next.json');
  w.path = `${w.bin}:/usr/bin:/bin:/usr/sbin:/sbin`;
  const exec = (version) =>
    `#!/bin/sh\ncase "$1" in -v|--version|-V) echo "${version}"; exit 0;; esac\nid="\${GMUX_SESSION_ID:-nosession}"\nexec "${process.execPath}" "${STAND_IN}" --plan "${w.plan}" --log "${w.ctl}/log-$id.jsonl" --ctl "${w.ctl}" --id "$id"\n`;
  writeFileSync(join(w.bin, 'claude'), exec('2.1.325 (Claude Code)'));
  writeFileSync(join(w.bin, 'codex'), exec('codex-cli 0.167.1'));
  // The app's SHELL. A restore recreates a session as `$SHELL` with NO arguments (the holder its resume
  // command is typed into, src/main/restore/restore.ts), so that start is the stand-in, and the restored
  // pane's program is what arm b reads; every other start (the login shell probe, a shell session's `-l`)
  // is /bin/sh with its own arguments.
  w.shell = join(w.bin, 'p368-sh');
  writeFileSync(
    w.shell,
    `#!/bin/sh\nif [ "$#" -eq 0 ] && [ -n "\${GMUX_SESSION_ID:-}" ]; then\n  exec "${process.execPath}" "${STAND_IN}" --plan "${w.plan}" --log "${w.ctl}/log-$GMUX_SESSION_ID.jsonl" --ctl "${w.ctl}" --id "$GMUX_SESSION_ID"\nfi\nexec /bin/sh "$@"\n`
  );
  for (const f of ['claude', 'codex', 'p368-sh']) chmodSync(join(w.bin, f), 0o755);
  for (const f of ['.profile', '.zprofile', '.zshrc', '.bash_profile']) writeFileSync(join(w.home, f), `export PATH="${w.bin}:$PATH"\nexport HISTFILE=/dev/null\n`);
  w.hookSh = join(w.root, 'hook.sh');
  writeFileSync(w.hookSh, `#!/bin/sh\nt=$(/usr/bin/perl -MTime::HiRes=time -e 'printf("%.3f", time*1000)')\nprintf '%s %s\\n' "$t" "$*" >> "${w.hookLog}"\n`);
  chmodSync(w.hookSh, 0o755);
  writeFileSync(w.plan, `${J({ tag: 'none', mode: 'winch' })}\n`);
  // JetBrains Mono chosen before the launch (arm c's first mount); a preference with no seal.
  if (kind === 'main') writeFileSync(join(w.profile, 'settings.json'), `${J({ version: 1, settings: { workAreaFont: 'jetbrains-mono' } })}\n`);
  return w;
}

// ---------------------------------------------------------------------------
// CDP: the page and main.
// ---------------------------------------------------------------------------

async function cdpForApp(profile, timeoutMs) {
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
        if (t.type !== 'page' || !t.webSocketDebuggerUrl || String(t.url).includes('/settings/')) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl, { collect: ['Runtime.exceptionThrown'] });
          const a = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxP95 === 'object' && typeof window.__gmuxP202 === 'object' ? location.href : null`, 5000);
          if (typeof a === 'string') return cdp;
          cdp.close();
        } catch {
          try {
            cdp?.close();
          } catch {
            /* already closed */
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Unreadable('no app window carrying the Phase 95 and Phase 202 drives');
    await sleep(300);
  }
}
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
    if (Date.now() - started > timeoutMs) throw new Unreadable("main's inspector never appeared (--inspect=0)");
    await sleep(300);
  }
}
async function mainEval(cdp, expression, ms = 20_000) {
  const r = await cdp.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true }, ms);
  if (r.error) throw new Error(`main refused the evaluation: ${J(r.error).slice(0, 300)}`);
  if (r.result?.exceptionDetails) throw new Error(`main threw: ${J(r.result.exceptionDetails).slice(0, 300)}`);
  return r.result?.result?.value;
}

const LOAD = `(typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule))`;
/** Main's recorders, put in place before anything is clicked or copied. */
const MAIN_PATCH = `(() => {
  const { shell, clipboard, ipcMain } = ${LOAD}('electron');
  if (globalThis.__p368m) return JSON.stringify(globalThis.__p368m.patched);
  const rec = { opened: [], paths: [], copies: [], clipboard: [] };
  const h = ipcMain._invokeHandlers;
  const orig = { openExternal: shell.openExternal, openPath: shell.openPath, showItemInFolder: shell.showItemInFolder, write: clipboard.write, writeText: clipboard.writeText, writeHTML: clipboard.writeHTML, writeRich: h && typeof h.get === 'function' ? h.get('clipboard:writeRich') : undefined };
  const at = () => Date.now();
  try { shell.openExternal = (url) => { rec.opened.push({ t: at(), url: String(url) }); return Promise.resolve(); }; } catch {}
  try { shell.openPath = (p) => { rec.paths.push({ t: at(), path: String(p) }); return Promise.resolve(''); }; } catch {}
  try { shell.showItemInFolder = (p) => { rec.paths.push({ t: at(), path: String(p), show: true }); }; } catch {}
  try { clipboard.write = (d) => { rec.clipboard.push({ t: at(), text: String(d && d.text || '') }); }; } catch {}
  try { clipboard.writeText = (s) => { rec.clipboard.push({ t: at(), text: String(s) }); }; } catch {}
  try { clipboard.writeHTML = (s) => { rec.clipboard.push({ t: at(), html: String(s).slice(0, 200) }); }; } catch {}
  let writeRich = false;
  if (h && typeof h.set === 'function' && typeof orig.writeRich === 'function') {
    h.set('clipboard:writeRich', (_e, input) => { rec.copies.push({ t: at(), text: String(input && input.text || ''), html: String(input && input.html || '').slice(0, 400) }); return undefined; });
    writeRich = h.get('clipboard:writeRich') !== orig.writeRich;
  }
  // A pass-through count of the history reads a copy makes, so a reading can say which path a copy took.
  rec.paneReads = [];
  const paneRead = h && typeof h.get === 'function' ? h.get('capture:pane') : undefined;
  if (typeof paneRead === 'function') {
    h.set('capture:pane', (e, input) => { rec.paneReads.push({ t: at(), join: !!(input && input.join), range: input && input.range ? [input.range.start, input.range.end] : null }); return paneRead(e, input); });
  }
  const patched = { openExternal: shell.openExternal !== orig.openExternal, openPath: shell.openPath !== orig.openPath, clipboard: clipboard.write !== orig.write && clipboard.writeText !== orig.writeText, writeRich, paneReads: typeof paneRead === 'function' };
  globalThis.__p368m = { rec, orig, patched, held: {} };
  return JSON.stringify(patched);
})()`;
const MAIN_COUNTS = `JSON.stringify({ opened: globalThis.__p368m.rec.opened.length, copies: globalThis.__p368m.rec.copies.length, paths: globalThis.__p368m.rec.paths.length, clipboard: globalThis.__p368m.rec.clipboard.length, paneReads: globalThis.__p368m.rec.paneReads.length })`;
const mainSince = (field, from) => `JSON.stringify(globalThis.__p368m.rec.${field}.slice(${String(from)}))`;
const MAIN_HOLD_RESIZE = (ms) => `(() => {
  const { ipcMain } = ${LOAD}('electron');
  const h = ipcMain._invokeHandlers;
  if (!globalThis.__p368m.held.resize) globalThis.__p368m.held.resize = h.get('sessions:resize');
  const orig = globalThis.__p368m.held.resize;
  if (typeof orig !== 'function') return false;
  h.set('sessions:resize', async (e, ...a) => { await new Promise((r) => setTimeout(r, ${String(ms)})); return orig(e, ...a); });
  return true;
})()`;
const MAIN_RELEASE_RESIZE = `(() => { const { ipcMain } = ${LOAD}('electron'); const o = globalThis.__p368m.held.resize; if (typeof o === 'function') ipcMain._invokeHandlers.set('sessions:resize', o); return true; })()`;
const MAIN_PICK_POPUP = (label) => `(() => {
  const { ipcMain } = ${LOAD}('electron');
  const h = ipcMain._invokeHandlers;
  if (!globalThis.__p368m.held.popup) globalThis.__p368m.held.popup = h.get('ui:popupMenu');
  globalThis.__p368m.popups = [];
  h.set('ui:popupMenu', async (_e, input) => {
    const labels = [];
    let id = null;
    const walk = (items) => { for (const it of items || []) { if (!it || it.type === 'separator') continue; labels.push(it.label); if (Array.isArray(it.submenu)) { walk(it.submenu); continue; } if (id === null && it.label === ${J(label)}) id = it.id; } };
    walk(input && input.items);
    globalThis.__p368m.popups.push({ labels, id });
    return id;
  });
  return true;
})()`;
const MAIN_RELEASE_POPUP = `(() => { const { ipcMain } = ${LOAD}('electron'); const o = globalThis.__p368m.held.popup; if (typeof o === 'function') ipcMain._invokeHandlers.set('ui:popupMenu', o); return JSON.stringify(globalThis.__p368m.popups || []); })()`;
const MAIN_WINDOW = (body) => `(async () => {
  const { BrowserWindow } = ${LOAD}('electron');
  const w = BrowserWindow.getAllWindows().find((x) => !x.isDestroyed() && /renderer\\/index\\.html/.test(x.webContents.getURL())) || BrowserWindow.getAllWindows()[0];
  ${body}
})()`;

// ---------------------------------------------------------------------------
// The page kit: the pane's own terminal, read through the public buffer API
// and xterm's link providers, and mouse events at cell centres.
// ---------------------------------------------------------------------------

const KIT = String.raw`(() => {
  if (window.__p368k) return true;
  const findTerm = (sid) => {
    const panes = [...document.querySelectorAll('.gmux-terminal-pane')];
    const pane = sid ? panes.find((p) => p.getAttribute('data-session-id') === sid) : panes[0];
    const mount = pane ? pane.querySelector('.gmux-terminal-mount') : null;
    if (!mount) return null;
    const key = Object.keys(mount).find((k) => k.startsWith('__reactFiber$'));
    if (!key) return null;
    let f = mount[key];
    for (let depth = 0; f && depth < 80; depth += 1, f = f.return) {
      let h = f.memoizedState, n = 0;
      while (h && typeof h === 'object' && n < 400) {
        const ms = h.memoizedState;
        if (ms && typeof ms === 'object' && 'current' in ms) { const c = ms.current; if (c && typeof c === 'object' && c.buffer && typeof c.write === 'function' && typeof c.rows === 'number' && c.element) return c; }
        h = h.next; n += 1;
      }
    }
    return null;
  };
  const cellOf = (t) => { const d = t._core && t._core._renderService && t._core._renderService.dimensions && t._core._renderService.dimensions.css && t._core._renderService.dimensions.css.cell; return d ? { w: d.width, h: d.height } : null; };
  const screenOf = (t) => t.element.querySelector('.xterm-screen');
  const centre = (t, x, y, fx) => { const r = screenOf(t).getBoundingClientRect(); const c = cellOf(t); return { x: r.left + (x + (fx === undefined ? 0.5 : fx)) * c.w, y: r.top + (y + 0.5) * c.h }; };
  const rec = { confirms: [], clip: [] };
  window.confirm = (m) => { rec.confirms.push(String(m).slice(0, 200)); return false; };
  try { if (navigator.clipboard) { navigator.clipboard.writeText = async (s) => { rec.clip.push(String(s).slice(0, 400)); }; navigator.clipboard.write = async () => { rec.clip.push('[write]'); }; } } catch (e) {}
  const viewLine = (t, y) => t.buffer.active.getLine(t.buffer.active.viewportY + y);
  const providers = (t) => { const ps = (t._core && t._core._linkProviderService && t._core._linkProviderService.linkProviders) || []; return { osc: ps.find((p) => p && '_oscLinkService' in p) || null, web: ps.find((p) => p && '_regex' in p) || null, n: ps.length }; };
  const provide = (p, y1) => new Promise((res) => { if (!p) return res([]); let done = false; const to = setTimeout(() => { if (!done) { done = true; res(null); } }, 3000); try { p.provideLinks(y1, (links) => { if (done) return; done = true; clearTimeout(to); res((links || []).map((l) => ({ text: String(l.text), range: l.range }))); }); } catch (e) { done = true; clearTimeout(to); res(null); } });
  window.__p368k = {
    rec,
    panes: () => [...document.querySelectorAll('.gmux-terminal-pane')].map((p) => p.getAttribute('data-session-id')),
    size: (sid) => { const t = findTerm(sid); if (!t) return null; const c = cellOf(t); return { cols: t.cols, rows: t.rows, cw: c ? c.w : null, ch: c ? c.h : null, type: t.buffer.active.type }; },
    rows: (sid) => { const t = findTerm(sid); if (!t) return null; const rows = [], wrapped = [], full = []; for (let i = 0; i < t.rows; i += 1) { const l = viewLine(t, i); rows.push(l ? l.translateToString(true, 0, t.cols) : ''); wrapped.push(l ? l.isWrapped === true : false); full.push(l ? l.translateToString(true) : ''); } return { cols: t.cols, nrows: t.rows, rows, wrapped, full, viewportY: t.buffer.active.viewportY, type: t.buffer.active.type }; },
    cells: (sid, y) => { const t = findTerm(sid); if (!t) return null; const line = viewLine(t, y); const out = []; if (!line) return out; for (let x = 0; x < t.cols; x += 1) { const c = line.getCell(x); if (!c || c.getWidth() === 0) continue; out.push([x, c.getChars() || ' ', c.getWidth()]); } return out; },
    // The fix round (arm d by CELLS): every visible row as its columns, a cell's text at its first column, ''
    // for the right half of a cell two wide, ' ' for a blank, so a row drawn one column off reads different.
    cellRows: (sid) => { const t = findTerm(sid); if (!t) return null; const cells = [], rows = []; for (let y = 0; y < t.rows; y += 1) { const line = viewLine(t, y); const r = []; for (let x = 0; x < t.cols; x += 1) { const c = line ? line.getCell(x) : undefined; r.push(!c ? ' ' : c.getWidth() === 0 ? '' : (c.getChars() || ' ')); } cells.push(r); rows.push(line ? line.translateToString(true, 0, t.cols) : ''); } return { cols: t.cols, nrows: t.rows, cells, rows }; },
    // The editor's tab strip as text, for a click that opens a file in Tortie (the fix round's path word).
    editorTabs: () => { const l = document.querySelector('.ed-tabs-list'); return l ? l.innerText.replace(/\s+/g, ' ').trim() : ''; },
    focus: (sid) => { const t = findTerm(sid); if (!t) return false; t.focus(); return true; },
    clearSelection: (sid) => { const t = findTerm(sid); if (!t) return false; t.clearSelection(); return true; },
    selection: (sid) => { const t = findTerm(sid); return t ? t.getSelection() : null; },
    selectionPos: (sid) => { const t = findTerm(sid); if (!t) return null; const p = t.getSelectionPosition(); return p ? { start: p.start, end: p.end, viewportY: t.buffer.active.viewportY, type: t.buffer.active.type } : null; },
    hasSelection: (sid) => { const t = findTerm(sid); return t ? t.hasSelection() : null; },
    selectAllRead: (sid) => {
      // xterm's own select-all text (unbounded) and the probe's own D11 reading of the same range:
      // every row within the terminal's columns, wrapped rows joined, each LINE's trailing spaces gone.
      const t = findTerm(sid); if (!t) return null;
      const b = t.buffer.active;
      t.selectAll();
      const xterm = t.getSelection();
      const out = [];
      const past = [];
      for (let y = 0; y < b.length; y += 1) {
        const line = b.getLine(y);
        const text = line ? line.translateToString(true, 0, Math.min(line.length, t.cols)) : '';
        if (line && line.length > t.cols) { const extra = line.translateToString(true, t.cols).trim(); if (extra.length >= 3) past.push(extra); }
        if (line && line.isWrapped && out.length > 0) out[out.length - 1] += text; else out.push(text);
      }
      t.clearSelection();
      return { xterm, drawn: out.map((l) => l.replace(/ /g, ' ').replace(/ +$/, '')).join('\n'), past, cols: t.cols, rows: t.rows };
    },
    point: (sid, x, y, fx) => { const t = findTerm(sid); return t ? centre(t, x, y, fx) : null; },
    mouse: (sid, type, x, y) => { const t = findTerm(sid); if (!t) return false; const c = centre(t, x, y); screenOf(t).dispatchEvent(new MouseEvent(type, { clientX: c.x, clientY: c.y, bubbles: true, cancelable: true, button: 0, buttons: type === 'mousedown' ? 1 : 0, view: window, detail: 1 })); return true; },
    leave: (sid) => { const t = findTerm(sid); if (!t) return false; screenOf(t).dispatchEvent(new MouseEvent('mouseleave', { bubbles: true })); return true; },
    hover: (sid) => { const t = findTerm(sid); if (!t) return null; const el = t.element.querySelector('.gmux-terminal-link-hover'); return el ? el.textContent : null; },
    // The pane terminal's active width provider (probe review, 2026-11-16): compareGrids compares TEXT, and a
    // row drawn one column off whose end tmux erased reads equal, so arm d also reads which widths the pane
    // draws with. 'threw' on a terminal made without allowProposedApi (the parent's pane), which has none.
    unicodeOf: (sid) => { const t = findTerm(sid); if (!t) return null; try { return String(t.unicode.activeVersion); } catch (e) { return 'threw'; } },
    linksAt: async (sid, y) => { const t = findTerm(sid); if (!t) return null; const p = providers(t); const y1 = t.buffer.active.viewportY + y + 1; return { osc: p.osc ? await provide(p.osc, y1) : [], web: p.web ? await provide(p.web, y1) : [], providers: p.n, haveOsc: p.osc !== null, haveWeb: p.web !== null }; },
    registered: (sid) => { const t = findTerm(sid); if (!t) return null; const m = t._core && t._core._oscLinkService && t._core._oscLinkService._dataByLinkId; if (!m) return []; return [...m.values()].map((e) => String((e && e.data && e.data.uri) || '')).filter(Boolean); },
    editCopy: (sid) => { const t = findTerm(sid); if (!t) return null; const dt = new DataTransfer(); const ev = new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true }); (t.textarea || t.element).dispatchEvent(ev); return { text: dt.getData('text/plain'), prevented: ev.defaultPrevented }; },
    escape: () => { const tgt = document.activeElement || document.body; tgt.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true })); return true; },
    key: (key, code, meta) => { const ta = document.querySelector('.xterm-helper-textarea'); if (ta) ta.focus(); const tgt = document.activeElement || document.body; tgt.dispatchEvent(new KeyboardEvent('keydown', { key, code, metaKey: !!meta, bubbles: true, cancelable: true })); return true; },
    bar: (ms, px) => new Promise((res) => { const wa = document.querySelector('.work-area'); if (!wa) return res(false); const d = document.createElement('div'); d.style.cssText = 'flex:0 0 ' + px + 'px;height:' + px + 'px;'; wa.insertBefore(d, wa.firstChild); setTimeout(() => { d.remove(); res(true); }, ms); }),
    ctx: (sid) => { const p = [...document.querySelectorAll('.gmux-terminal-pane')].find((x) => x.getAttribute('data-session-id') === sid); if (!p) return false; const r = p.getBoundingClientRect(); p.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 40, clientY: r.top + 40, button: 2 })); return true; },
    viewport: () => [window.innerWidth, window.innerHeight]
  };
  return true;
})()`;

const KEYS = Object.freeze({
  cmdC: { key: 'c', code: 'KeyC', windowsVirtualKeyCode: 67, nativeVirtualKeyCode: 67, modifiers: 4 },
  cmdA: { key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 4 }
});

// ---------------------------------------------------------------------------
// The kit one launch drives with.
// ---------------------------------------------------------------------------

function makeKit({ cdp, main, world, tmuxBin, build, kind }) {
  const k = { cdp, main, world, tmuxBin, build, kind, notes: [], names: {}, logs: {} };
  k.ev = (expr, ms = 60_000) => cdpEval(cdp, expr, ms);
  k.mev = (expr, ms = 20_000) => mainEval(main, expr, ms);
  k.note = (s) => {
    k.notes.push(s);
    say(`(${build} ${kind}) ${s}`);
  };
  k.tmux = (...args) => spawnSync(tmuxBin, ['-u', '-L', socket, ...args], { encoding: 'utf8', env: TMUX_ENV, timeout: 15_000 });
  k.menu = (id) => k.mev(MAIN_WINDOW(`w.webContents.send('ui:menuAction', ${J(id)}); return true;`));
  k.state = async () => JSON.parse(await k.ev('window.__gmuxP95.state().then((s) => JSON.stringify(s))'));
  k.select = (sid, wait = true) => k.ev(wait ? `window.__gmuxP95.select(${J(sid)}).then(() => true)` : `(window.__gmuxP95.select(${J(sid)}), true)`);
  k.size = async (sid) => k.ev(`window.__p368k.size(${J(sid)})`).catch(() => null);
  k.sizeStr = async (sid) => {
    const s = await k.size(sid);
    return s ? `${String(s.cols)}x${String(s.rows)}` : null;
  };
  let planSeq = 0;
  k.plan = (plan) => {
    planSeq += 1;
    const tag = `${build}-${kind}-${String(planSeq)}`;
    writeFileSync(world.plan, `${J({ tag, ...plan })}\n`);
    return tag;
  };
  k.log = (sid) => {
    const p = join(world.ctl, `log-${sid}.jsonl`);
    if (!existsSync(p)) return [];
    const out = [];
    for (const l of readFileSync(p, 'utf8').split('\n')) {
      if (l === '') continue;
      try {
        out.push(JSON.parse(l));
      } catch {
        /* a line being written */
      }
    }
    return out;
  };
  k.waitLog = async (sid, pred, ms, what) => {
    const until = Date.now() + ms;
    for (;;) {
      const hit = k.log(sid).find((e, i) => pred(e, i));
      if (hit !== undefined) return hit;
      if (Date.now() > until) throw new Unreadable(`${what ?? 'a stand-in event'} never came for ${sid} in ${String(ms)} ms`);
      await sleep(15);
    }
  };
  k.touch = (name) => writeFileSync(join(world.ctl, name), '');
  k.hooks = () => {
    if (!existsSync(world.hookLog)) return [];
    return readFileSync(world.hookLog, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        const [t, kd, client, size, ...rest] = l.split(' ');
        return { t: Number(t), k: kd, client, size, session: rest.join(' ') };
      });
  };
  k.tmuxNameOf = (sid) => {
    if (k.names[sid]) return k.names[sid];
    const r = k.tmux('list-sessions', '-F', '#{session_name}\t#{@gmux-id}');
    const line = (r.stdout ?? '').split('\n').find((l) => l.split('\t')[1] === sid);
    const name = line ? line.split('\t')[0] : null;
    if (name) k.names[sid] = name;
    return name;
  };
  k.paneOf = (sid) => {
    const r = k.tmux('list-panes', '-a', '-F', '#{pane_id}\t#{@gmux-id}');
    const line = (r.stdout ?? '').split('\n').find((l) => l.split('\t')[1] === sid);
    return line ? line.split('\t')[0] : null;
  };
  k.create = async (name, agent, plan) => {
    const tag = plan === null ? null : k.plan(plan);
    const t0 = now();
    const st = JSON.parse(await k.ev(`window.__gmuxP95.create(${J({ name, agent })}).then((s) => JSON.stringify(s))`, 90_000));
    const sid = st.sessions.find((x) => x.name === name)?.id ?? null;
    if (sid === null) throw new Unreadable(`the session ${name} was not created`);
    if (tag !== null) await k.waitLog(sid, (e) => e.ev === 'start' && e.plan?.tag === tag, 15_000, `the stand-in of ${name}`);
    k.tmuxNameOf(sid);
    return { sid, t0, tag };
  };
  k.ensureVisible = async (sid, where) => {
    for (let i = 0; i < 8; i += 1) {
      if ((await k.size(sid)) !== null) return true;
      if (i === 3) {
        await k.menu('prev-project');
        await sleep(1200);
        continue;
      }
      await k.select(sid);
      await sleep(600);
    }
    k.note(`the pane of ${sid} was not on screen (${where})`);
    return false;
  };
  k.fit = async (sid, cols, rows) => {
    let [W, H] = await k.ev('window.__p368k.viewport()');
    for (let i = 0; i < 10; i += 1) {
      const s = await k.size(sid);
      if (s && s.cols === cols && s.rows === rows) return { W, H, cols, rows };
      if (s && s.cw > 0 && s.ch > 0) {
        W = Math.round(W + (cols - s.cols) * s.cw + (cols > s.cols ? 1 : cols < s.cols ? -1 : 0));
        H = Math.round(H + (rows - s.rows) * s.ch + (rows > s.rows ? 1 : rows < s.rows ? -1 : 0));
      }
      await cdp.call('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 0, mobile: false });
      await sleep(700);
    }
    const s = await k.size(sid);
    throw new Unreadable(`the pane could not be fitted to ${String(cols)}x${String(rows)} (it reads ${J(s)})`);
  };
  k.unfit = async () => {
    await cdp.call('Emulation.clearDeviceMetricsOverride');
    await sleep(800);
  };
  k.counts = async () => JSON.parse(await k.mev(MAIN_COUNTS));
  k.copiesSince = async (from) => JSON.parse(await k.mev(mainSince('copies', from)));
  k.openedSince = async (from) => JSON.parse(await k.mev(mainSince('opened', from)));
  k.key = async (spec) => {
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...spec });
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...spec });
  };
  /** ⌘C, then the text main's recorder was handed within `ms`, or null; `k.lastCopy` says whether a joined history read made it. */
  k.copy = async (sid, ms = 4000) => {
    const before = await k.counts();
    k.lastCopy = { selection: await k.ev(`(() => { const p = window.__p368k; return p.hasSelection(${J(sid)}); })()`).catch(() => null), historyReads: 0 };
    await k.ev(`window.__p368k.focus(${J(sid)})`);
    await k.key(KEYS.cmdC);
    const until = Date.now() + ms;
    while (Date.now() < until) {
      const got = await k.copiesSince(before.copies);
      if (got.length > 0) {
        const reads = JSON.parse(await k.mev(mainSince('paneReads', before.paneReads)));
        k.lastCopy.historyReads = reads.filter((r) => r.join).length;
        return got[0].text;
      }
      await sleep(60);
    }
    return null;
  };
  k.mouseAt = async (type, x, y, extra = {}) => cdp.call('Input.dispatchMouseEvent', { type, x, y, button: 'left', ...extra });
  /** A real drag (CDP input) from the left of cell (x0, y0) to the right of cell (x1, y1), not leaving the screen. */
  k.drag = async (sid, x0, y0, x1, y1) => {
    const a = await k.ev(`window.__p368k.point(${J(sid)}, ${String(x0)}, ${String(y0)}, 0.15)`);
    const b = await k.ev(`window.__p368k.point(${J(sid)}, ${String(x1)}, ${String(y1)}, 0.85)`);
    await k.mouseAt('mouseMoved', a.x, a.y, { buttons: 0 });
    await k.mouseAt('mousePressed', a.x, a.y, { buttons: 1, clickCount: 1 });
    for (let i = 1; i <= 6; i += 1) await k.mouseAt('mouseMoved', a.x + ((b.x - a.x) * i) / 6, a.y + ((b.y - a.y) * i) / 6, { buttons: 1 });
    await k.mouseAt('mouseReleased', b.x, b.y, { buttons: 0, clickCount: 1 });
    await sleep(350);
  };
  /** A real double or triple click (CDP input) on cell (x, y). */
  k.clicks = async (sid, x, y, n) => {
    const a = await k.ev(`window.__p368k.point(${J(sid)}, ${String(x)}, ${String(y)}, 0.5)`);
    await k.mouseAt('mouseMoved', a.x, a.y, { buttons: 0 });
    for (let c = 1; c <= n; c += 1) {
      await k.mouseAt('mousePressed', a.x, a.y, { buttons: 1, clickCount: c });
      await k.mouseAt('mouseReleased', a.x, a.y, { buttons: 0, clickCount: c });
    }
    await sleep(400);
  };
  return k;
}

/** The sizes a stand-in's log entries [from, to) hold: its start (when asked) and every change it polled. */
function paneSizes(events, from, to, withStart = true) {
  return events
    .slice(from, to)
    .filter((e) => e.ev === 'poll' || (withStart && e.ev === 'start'))
    .map((e) => `${String(e.cols)}x${String(e.rows)}`);
}
/**
 * The server's events for one tmux session among the hook entries [from, to). Every reading here is
 * attributed by the logs' ORDER, read at each step's boundary, and never by a clock: a hook runs a shell and
 * perl, so its stamp lands 100 to 200 ms after the event, and a probe that has run for minutes drifts tens of
 * milliseconds from a process started now. `t` is the hook's own stamp from the window's first entry, read
 * only against other hooks.
 */
function serverEvents(hooks, name, from, to) {
  const slice = hooks.slice(from, to);
  const base = slice.length > 0 ? slice[0].t : 0;
  return slice.filter((h) => h.session === name).map((h) => ({ k: h.k, t: Math.round(h.t - base), size: h.size }));
}
/** Where the logs stand now: the hook log's length and each named stand-in log's. */
function offsets(k, sids) {
  const o = { h: k.hooks().length };
  for (const sid of sids) o[sid] = k.log(sid).length;
  return o;
}
const sizeOf = (e) => (e ? `${String(e.cols)}x${String(e.rows)}` : null);

// ---------------------------------------------------------------------------
// The phases.
// ---------------------------------------------------------------------------

async function setup(k, R) {
  await k.mev(MAIN_WINDOW('w.setSize(1300, 820); await new Promise((r) => setTimeout(r, 800)); return true;'));
  for (const [hook, tag] of [['client-resized', 'R'], ['client-attached', 'A'], ['client-detached', 'D']]) {
    const r = k.tmux('set-hook', '-g', hook, `run-shell -b "${k.world.hookSh} ${tag} #{client_name} #{client_width}x#{client_height} #{session_name}"`);
    if (r.status !== 0) k.note(`set-hook ${hook} failed: ${String(r.stderr).trim()}`);
  }
  R.tmuxVersion = String(k.tmux('display-message', '-p', '#{version}').stdout ?? '').trim();
  await k.ev(`window.__gmuxP95.openLocal(${J(k.world.proj1)}).then(() => true)`);
  // The launch's first terminal, a size watcher, so its program's side is read too: JetBrains Mono was
  // chosen before the launch, and this is the mount that loads the face (arm c's first-mount row).
  const o0 = offsets(k, []);
  const S1 = await k.create('p368-first', 'claude', { mode: 'winch' });
  await sleep(2500);
  const o1 = offsets(k, [S1.sid]);
  const W = await k.create('p368-W', 'claude', { mode: 'winch' });
  await sleep(1500);
  await k.ensureVisible(W.sid, 'setup');
  const fitted = await k.sizeStr(W.sid);
  await sleep(400);
  const o2 = offsets(k, [S1.sid, W.sid]);
  const hooks = k.hooks();
  const ids = { S1: S1.sid, W: W.sid };
  R.ids = ids;
  R.font = await k.ev(`window.gmux.settingsGet().then((s) => String(s && s.workAreaFont)).catch(() => null)`).catch(() => null);
  R.fontRow = { pane: paneSizes(k.log(S1.sid), 0, o1[S1.sid]), server: serverEvents(hooks, k.tmuxNameOf(S1.sid), o0.h, o1.h), err: null, workAreaFont: R.font };
  const evs = k.log(W.sid).slice(0, o2[W.sid]);
  const start = evs.find((e) => e.ev === 'start');
  R.newRow = {
    pane: paneSizes(evs, 0, evs.length),
    server: serverEvents(hooks, k.tmuxNameOf(W.sid), o1.h, o2.h),
    fitted,
    err: null,
    start: sizeOf(start),
    later: paneSizes(evs, 0, evs.length, false)
  };
  return ids;
}

async function armA(k, ids) {
  const out = { returns: [] };
  const marks = [];
  for (const delay of [15, 30]) {
    const took = await k.mev(MAIN_HOLD_RESIZE(delay));
    if (took !== true) throw new Unreadable("main's sessions:resize handler could not be held back");
    for (let i = 0; i < 4; i += 1) {
      await k.select(ids.S1, false);
      await sleep(600);
      const ob = offsets(k, [ids.W]);
      await k.select(ids.W, false);
      await sleep(1600);
      await k.ensureVisible(ids.W, `held ${String(delay)} ms #${String(i)}`);
      const fitted = await k.sizeStr(ids.W);
      marks.push({ delay, i, ob, oe: offsets(k, [ids.W]), fitted });
    }
  }
  await k.mev(MAIN_RELEASE_RESIZE);
  await sleep(500);
  const evs = k.log(ids.W);
  const hooks = k.hooks();
  const name = k.tmuxNameOf(ids.W);
  for (const m of marks) {
    const server = serverEvents(hooks, name, m.ob.h, m.oe.h);
    const attach = server.find((e) => e.k === 'A');
    out.returns.push({ delay: m.delay, i: m.i, pane: paneSizes(evs, m.ob[ids.W], m.oe[ids.W], false), attach: attach ? attach.size : null, server, fitted: m.fitted });
  }
  return out;
}

/** The second project, with a session in it, made once (a project switch moves the view off the first). */
async function ensureSecondProject(k) {
  if (k.secondProject) return;
  await k.ev(`window.__gmuxP95.openLocal(${J(k.world.proj2)}).then(() => true)`);
  await k.create('p368-other', 'claude', { mode: 'winch' });
  await k.menu('prev-project');
  await sleep(1500);
  k.secondProject = true;
}

/**
 * Kill a session's tmux session from outside, wait for its row to say so, and restore it OFF SCREEN: from the
 * second project, so its first attach comes only once its program has started and painted, which is the
 * order an agent's real start gives and a stand-in that starts in milliseconds would otherwise race. `how` is
 * the store's own verb (every Restore control's funnel, which names the size at HEAD) or the bridge's
 * `sessions.restore` (main's last fitted size at HEAD, D2). Answers the program's start and every size after it.
 */
async function restoreOffScreen(k, sid, plan, how, waitFor) {
  const name = k.tmuxNameOf(sid);
  if (name === null) throw new Unreadable(`no tmux session for ${sid}`);
  k.tmux('kill-session', '-t', `=${name}`);
  const seen = [];
  let status = null;
  const until = Date.now() + 20_000;
  while (Date.now() < until) {
    status = (await k.state()).sessions.find((x) => x.id === sid)?.status ?? null;
    if (seen.at(-1) !== status) seen.push(status);
    if (status === 'restorable') break;
    await sleep(400);
  }
  await k.menu('next-project');
  await sleep(1500);
  const tag = k.plan(plan);
  const o = offsets(k, [sid]);
  const answer =
    how === 'bridge'
      ? await k.ev(`window.gmux.sessions.restore(${J(sid)}).then(() => 'restored').catch((e) => 'refused: ' + String(e && e.message || e))`, 90_000)
      : await k.ev(`window.__gmuxP202.restoreSession(${J(sid)}).then((r) => (r === true ? 'restored' : 'no row')).catch((e) => 'refused: ' + String(e && e.message || e))`, 90_000);
  try {
    await k.waitLog(sid, (e) => e.ev === 'start' && e.plan?.tag === tag, 20_000, 'the restored stand-in');
    if (waitFor) await k.waitLog(sid, (e, i) => i >= o[sid] && e.ev === 'segment' && e.name === waitFor, 30_000, `the restored program's ${waitFor} paint`);
  } catch (e) {
    const st = await k.state().catch(() => null);
    const row = st?.sessions.find((x) => x.id === sid) ?? null;
    throw new Unreadable(`${e.message}: status seen ${J(seen)}, the restore answered ${J(answer)}, now ${J(row?.status ?? null)}, toasts ${J((st?.toasts ?? []).slice(-3))}`);
  }
  await k.menu('prev-project');
  await sleep(1200);
  delete k.names[sid];
  await k.select(sid);
  await k.ensureVisible(sid, 'the restored session, shown');
  await sleep(2800);
  const fitted = await k.sizeStr(sid);
  const end = offsets(k, [sid]);
  const ev = k.log(sid);
  const at = ev.findIndex((e) => e.ev === 'start' && e.plan?.tag === tag);
  return {
    start: sizeOf(ev[at]),
    later: paneSizes(ev, at + 1, end[sid], false),
    fitted,
    status: seen.at(-1) ?? null,
    seen,
    restoreOk: answer === 'restored',
    how,
    o,
    end,
    events: ev.slice(at, end[sid])
  };
}

async function census(k, ids, R, onlyRestore) {
  const steps = [];
  const W = ids.W;
  const step = async (name, fn, settle = 1800) => {
    const o = offsets(k, [W]);
    let err = null;
    try {
      await fn();
    } catch (e) {
      err = String(e?.message ?? e).slice(0, 300);
    }
    await sleep(settle);
    const fitted = await k.sizeStr(W);
    steps.push({ name, o, oEnd: offsets(k, [W]), err, fitted });
  };
  if (!onlyRestore) {
    for (let i = 0; i < 8; i += 1) {
      await step(`tab-away-${String(i)}`, () => k.select(ids.S1, false), [150, 300, 1000, 2000][i % 4]);
      await step(`tab-back-${String(i)}`, () => k.select(W, false), 1500);
    }
    await ensureSecondProject(k);
    await k.ensureVisible(W, 'after the second project');
    for (let i = 0; i < 4; i += 1) {
      await step(`project-away-${String(i)}`, () => k.menu('next-project'), 800);
      await step(`project-back-${String(i)}`, () => k.menu('prev-project'), 1500);
      await k.ensureVisible(W, `project-back-${String(i)}`);
    }
    await step('sidebar-off', () => k.menu('toggle-sidebar'));
    await step('sidebar-on', () => k.menu('toggle-sidebar'));
    await step('editor-on', () => k.menu('toggle-editor'));
    await step('editor-off', () => k.menu('toggle-editor'));
    await step('orientation-right', () => k.ev(`window.__gmuxP95.orientation('right').then(() => true)`));
    await step('orientation-top', () => k.ev(`window.__gmuxP95.orientation('top').then(() => true)`));
    await step('newsession-sheet-open', () => k.menu('new-session'));
    await step('newsession-sheet-close', () => k.ev('window.__p368k.escape()'));
    await step('attention-open', () => k.menu('attention'));
    await step('attention-close', () => k.ev('window.__p368k.escape()'));
    await step('shortcuts-open', () => k.menu('shortcuts'));
    await step('shortcuts-close', () => k.ev('window.__p368k.escape()'));
    await step('overview-open', () => k.menu('show-overview'), 2500);
    await step('overview-close', () => k.menu('show-overview'), 2500);
    await k.select(W);
    await sleep(800);
    await step('focus-mode-on', () => k.menu('toggle-session-focus'), 2500);
    await step('focus-mode-off', () => k.menu('toggle-session-focus'), 2500);
    await k.ensureVisible(W, 'zoom');
    await step('zoom-in', () => k.ev('window.__p368k.key("=", "Equal", true)'));
    await step('zoom-out', () => k.ev('window.__p368k.key("-", "Minus", true)'));
    await k.ensureVisible(W, 'drag');
    await step(
      'window-drag',
      () => k.mev(MAIN_WINDOW('const [x, y] = w.getSize(); for (let i = 1; i <= 25; i += 1) { w.setSize(x - i * 12, y - i * 6); await new Promise((r) => setTimeout(r, 16)); } for (let i = 24; i >= 0; i -= 1) { w.setSize(x - i * 12, y - i * 6); await new Promise((r) => setTimeout(r, 16)); } return true;'), 30_000),
      2000
    );
    for (const ms of [8, 60]) {
      await step(`viewport-${String(ms)}ms`, async () => {
        const [w, h] = await k.ev('window.__p368k.viewport()');
        await k.cdp.call('Emulation.setDeviceMetricsOverride', { width: w, height: h - 90, deviceScaleFactor: 0, mobile: false });
        await sleep(ms);
        await k.cdp.call('Emulation.clearDeviceMetricsOverride');
      });
    }
    await step('layout-bar-8ms', () => k.ev('window.__p368k.bar(8, 90)'));
    await step('layout-bar-60ms', () => k.ev('window.__p368k.bar(60, 90)'));
    await k.ensureVisible(W, 'split');
    // The split, through the session's own menu row: main's popup answered with the Split Session row.
    k.plan({ mode: 'winch' });
    const before = new Set((await k.state()).sessions.map((x) => x.id));
    await k.mev(MAIN_PICK_POPUP('Split Session'));
    await step('split', () => k.ev(`window.__p368k.ctx(${J(W)})`), 4000);
    const popups = JSON.parse((await k.mev(MAIN_RELEASE_POPUP)) ?? '[]');
    const partner = (await k.state()).sessions.find((x) => !before.has(x.id))?.id ?? null;
    R.split = { partner, popups: popups.map((p) => ({ id: p.id, labels: p.labels.slice(0, 30) })) };
    if (partner !== null) await step('split-partner-ended', () => k.ev(`window.gmux.sessions.kill(${J(partner)}).then(() => true)`), 3000);
    await k.select(W);
    await sleep(1000);
    const otherName = k.tmuxNameOf(ids.S1);
    if (otherName) await step('other-session-died', () => k.tmux('kill-session', '-t', `=${otherName}`), 3000);
  }
  // The restored session: made, its tmux session killed from outside, restored through the store's verb.
  await ensureSecondProject(k);
  const Rs = await k.create('p368-R', 'claude', { mode: 'winch' });
  await sleep(1500);
  await k.ensureVisible(Rs.sid, 'restore');
  const restore = await restoreOffScreen(k, Rs.sid, { mode: 'winch' }, 'funnel', null);
  if (!onlyRestore) {
    await k.select(W);
    await k.ensureVisible(W, 'full screen');
    await step('fullscreen-on', () => k.mev(MAIN_WINDOW('w.setFullScreen(true); return true;')), 3500);
    await step('fullscreen-off', () => k.mev(MAIN_WINDOW('w.setFullScreen(false); return true;')), 3500);
  }
  await sleep(1200);
  // read everything
  const hooks = k.hooks();
  const evW = k.log(W);
  const nameW = k.tmuxNameOf(W);
  const rows = {};
  const order = [];
  for (const st of steps) {
    rows[st.name] = { pane: paneSizes(evW, st.o[W], st.oEnd[W], false), server: serverEvents(hooks, nameW, st.o.h, st.oEnd.h), fitted: st.fitted, err: st.err };
    order.push(st.name);
  }
  if (R.split?.partner && rows.split) {
    const ev = k.log(R.split.partner);
    const hup = ev.findIndex((e) => e.ev === 'SIGHUP' || e.ev === 'SIGTERM');
    rows.split.partner = { start: sizeOf(ev.find((e) => e.ev === 'start')), later: paneSizes(ev, 0, hup === -1 ? ev.length : hup, false) };
  }
  const restored = { start: restore.start, later: restore.later, fitted: restore.fitted, status: restore.status, restoreOk: restore.restoreOk, how: restore.how };
  rows.restored = {
    pane: [restore.start, ...restore.later].filter(Boolean),
    server: serverEvents(hooks, k.tmuxNameOf(Rs.sid), restore.o.h, restore.end.h),
    fitted: restore.fitted,
    err: restore.restoreOk ? null : 'the restore was refused'
  };
  if (R.newRow) rows['new-session'] = R.newRow;
  if (R.fontRow) rows['font-first-mount'] = R.fontRow;
  return { rows, order: ['font-first-mount', 'new-session', ...order, 'restored'], restored };
}

/**
 * Research 145's cold1: a restored Claude that paints at its start size and repaints once on another size.
 * Restored through the bridge's `sessions.restore` off screen (main's last fitted size at HEAD, D2), shown only
 * once it has painted.
 */
async function armB3(k) {
  await ensureSecondProject(k);
  const B = await k.create('p368-B3', 'claude', { mode: 'winch' });
  await sleep(1200);
  await k.ensureVisible(B.sid, 'the restored replay');
  const fx = FIXTURES['claude-restore'].fixture;
  const wantSize = fx.segments.repaintSize;
  await k.fit(B.sid, wantSize.cols, wantSize.rows);
  await sleep(800);
  const r = await restoreOffScreen(k, B.sid, { mode: 'reactive', fixture: fixturePath('claude-restore'), maxGapMs: 400 }, 'bridge', 'start');
  await sleep(1500);
  const pane = k.paneOf(B.sid);
  const cap = pane ? String(k.tmux('capture-pane', '-p', '-S', '-', '-E', '-', '-t', pane).stdout ?? '') : '';
  const ev = k.log(B.sid);
  const at = ev.findIndex((e) => e === undefined ? false : e.ev === 'start' && e.plan?.mode === 'reactive');
  const after = ev.slice(at);
  await k.unfit();
  return {
    start: r.start,
    later: r.later,
    fitted: r.fitted,
    repainted: after.some((e) => e.ev === 'repaint'),
    items: G.itemCounts(cap),
    rowsRead: cap.split('\n').length,
    status: r.status,
    restoreOk: r.restoreOk,
    how: r.how
  };
}

/**
 * Each server's measured widths (build/fixtures/screen/tmux-widths.json, the committed Phase 337 scan), for
 * arm d's comparison by CELLS: tmux's text placed where tmux draws it (G.tmuxColumns), against the terminal's
 * own columns.
 */
const WIDTHS_JSON = JSON.parse(readFileSync(join(ROOT, 'build', 'fixtures', 'screen', 'tmux-widths.json'), 'utf8'));
const WIDTH_OF = Object.freeze({ '3.7b': G.widthTable(WIDTHS_JSON.builds['3.7b'].ranges), '3.6a': G.widthTable(WIDTHS_JSON.builds['3.6a'].ranges) });

/**
 * The terminal's visible rows against `capture-pane -p`, once both have settled, compared CELL BY CELL (the
 * fix round, Lens A): a row the terminal draws one column off reads equal by text, and Lens A counted 94 such
 * rows at the parent where the text compare counted 8. `differing` counts rows whose cells differ;
 * `textDiffering` is the old text count, printed beside it.
 */
async function compareGrids(k, sid, pane, version) {
  const widthOf = WIDTH_OF[version];
  if (widthOf === undefined) throw new Unreadable(`no measured widths for tmux ${J(version)}`);
  let last = null;
  let lastT = null;
  let stable = 0;
  for (let i = 0; i < 24; i += 1) {
    const x = await k.ev(`window.__p368k.cellRows(${J(sid)})`);
    const t = String(k.tmux('capture-pane', '-p', '-t', pane).stdout ?? '').split('\n');
    if (t.at(-1) === '') t.pop();
    if (x === null) throw new Unreadable(`the pane of ${sid} is not on screen`);
    if (G.cellDiffs(x.cells, t, widthOf, x.cols).length === 0) return { differing: 0, textDiffering: 0, gaps: 0, samples: [] };
    stable = last !== null && J(last.cells) === J(x.cells) ? stable + 1 : 0;
    last = x;
    lastT = t;
    if (stable >= 4) break;
    await sleep(70);
  }
  const cellRows = new Set(G.cellDiffs(last.cells, lastT, widthOf, last.cols).map((d) => d.y));
  const diffs = [];
  let textDiffering = 0;
  for (let y = 0; y < Math.max(last.rows.length, lastT.length); y += 1) {
    const a = (last.rows[y] ?? '').replace(/\s+$/, '');
    const b = (lastT[y] ?? '').replace(/\s+$/, '');
    if (a !== b) textDiffering += 1;
    if (cellRows.has(y)) diffs.push({ y, term: a.slice(0, 160), tmux: b.slice(0, 160), gap: G.letterInGap(a, b) });
  }
  return { differing: diffs.length, textDiffering, gaps: diffs.filter((d) => d.gap).length, samples: diffs.slice(0, 4) };
}

/**
 * Find words on screen: { y, x0, x1, whole } in cells, matching with runs of
 * spaces collapsed, or null. Words longer than 40 characters are found by their
 * first 40 (a link cut over two rows), and `whole` says whether the row holds
 * all of them.
 */
async function findWords(k, sid, rowsRead, words, from = 0) {
  const norm = (s) => s.replace(/\s+/g, ' ');
  const all = norm(words);
  const needle = all.length > 40 ? all.slice(0, 40) : all;
  for (let y = from; y < rowsRead.rows.length; y += 1) {
    if (!norm(rowsRead.rows[y]).includes(needle)) continue;
    const cells = await k.ev(`window.__p368k.cells(${J(sid)}, ${String(y)})`);
    let text = '';
    const at = [];
    let prevSpace = false;
    for (const [x, ch] of cells) {
      const sp = /^\s$/.test(ch);
      if (sp && prevSpace) continue;
      text += sp ? ' ' : ch;
      for (let i = 0; i < (sp ? 1 : ch.length); i += 1) at.push(x);
      prevSpace = sp;
    }
    const i = text.indexOf(needle);
    if (i === -1) continue;
    return { y, x0: at[i], x1: at[Math.min(at.length - 1, i + needle.length - 1)], whole: text.includes(all) };
  }
  return null;
}
/** The cells [a, b] a link's range covers on buffer row `vy` (1-based), or null. */
const rowSpan = (r, vy, cols) => {
  if (!r || vy < r.start.y || vy > r.end.y) return null;
  return [vy === r.start.y ? r.start.x - 1 : 0, vy === r.end.y ? r.end.x - 1 : cols - 1];
};
const overlaps = (s, t) => s !== null && t !== null && s[0] <= t[1] && t[0] <= s[1];
const cut = (s, n = 4100) => (typeof s === 'string' && s.length > n ? `${s.slice(0, n)}…` : s);

/** Hover and click one cell: what xterm holds there, the hover line, and what main was handed. */
async function hoverAndClick(k, sid, x, y, rowsRead) {
  const links = await k.ev(`window.__p368k.linksAt(${J(sid)}, ${String(y)})`);
  const vy = rowsRead.viewportY + y + 1;
  const cols = rowsRead.cols;
  const covers = (l) => {
    const s = rowSpan(l.range, vy, cols);
    return s !== null && s[0] <= x && x <= s[1];
  };
  // the OSC link on the clicked cell, and D14's W: the web-links reading's address whose range meets that link's
  // range on this row (the address on the cell itself when there is no OSC link)
  const osc = (links?.osc ?? []).find(covers) ?? null;
  const web = (links?.web ?? []).find((l) => (osc ? overlaps(rowSpan(l.range, vy, cols), rowSpan(osc.range, vy, cols)) : covers(l))) ?? null;
  const before = (await k.counts()).opened;
  await k.ev(`window.__p368k.mouse(${J(sid)}, 'mousemove', ${String(x)}, ${String(y)})`);
  // THE FIX ROUND: a link whose words hold no address the pointer is on asks the pane's path provider first
  // (D14 rule 0), and on a row holding a path-shaped word that answer is a round trip to main, so the hover
  // line and the click's open can come later than a fixed wait under load. Both are polled, the hover for up
  // to 1.5 s and the open for up to 2 s; a reading that stays empty waits the whole bound at both builds.
  await sleep(350);
  let hover = await k.ev(`window.__p368k.hover(${J(sid)})`);
  for (let i = 0; i < 12 && hover === null; i += 1) {
    await sleep(100);
    hover = await k.ev(`window.__p368k.hover(${J(sid)})`);
  }
  await k.ev(`window.__p368k.mouse(${J(sid)}, 'mousedown', ${String(x)}, ${String(y)})`);
  await k.ev(`window.__p368k.mouse(${J(sid)}, 'mouseup', ${String(x)}, ${String(y)})`);
  await sleep(450);
  let opened = (await k.openedSince(before)).map((o) => cut(o.url));
  for (let i = 0; i < 16 && opened.length === 0; i += 1) {
    await sleep(100);
    opened = (await k.openedSince(before)).map((o) => cut(o.url));
  }
  if (opened.length > 0) {
    // and a moment more, so a second open of one click is seen
    await sleep(200);
    opened = (await k.openedSince(before)).map((o) => cut(o.url));
  }
  await k.ev(`window.__p368k.leave(${J(sid)})`);
  await sleep(150);
  const hoverAfterLeave = await k.ev(`window.__p368k.hover(${J(sid)})`);
  await k.ev(`window.__p368k.clearSelection(${J(sid)})`);
  // The fix round's D14 inputs, recorded raw so the grader derives the cut itself: whether W reaches its row's
  // last cell (the reading answers that as column 0 of the next row), the clicked row and the rows after it,
  // and the four rows above it with each address that ends on that row and whether it ends at the edge.
  const atEdge = (r) => r.end.x < 1 || r.end.x >= cols;
  const endsOn = (r, vRow) => (r.end.x < 1 ? r.end.y - 1 : r.end.y) === vRow;
  const rowsAbove = [];
  for (let dy = 1; dy <= 4 && y - dy >= 0; dy += 1) {
    const above = await k.ev(`window.__p368k.linksAt(${J(sid)}, ${String(y - dy)})`);
    const vAbove = rowsRead.viewportY + (y - dy) + 1;
    rowsAbove.push({ row: rowsRead.rows[y - dy] ?? '', webs: (above?.web ?? []).map((w) => ({ address: w.text, atEdge: atEdge(w.range), endsOnRow: endsOn(w.range, vAbove) })) });
  }
  return {
    x,
    y,
    target: osc ? cut(osc.text) : null,
    targetLen: osc ? osc.text.length : null,
    web: web ? web.text : null,
    webAtEdge: web ? atEdge(web.range) : null,
    cols,
    rowsFrom: rowsRead.rows.slice(y, y + 6),
    before: rowsAbove,
    next: rowsRead.rows[y + 1] ?? '',
    hover: cut(hover),
    hoverAfterLeave: cut(hoverAfterLeave),
    opened,
    providers: links?.providers ?? null
  };
}

/**
 * The fix round's path word: hover and click a project file's name an agent linked to a web page, and read
 * what main was handed (openExternal) and the editor's tab strip before and after (polled, because the path
 * door asks main before the file opens).
 */
async function clickPathWord(k, sid, x, y, rowsRead) {
  const tabsBefore = await k.ev('window.__p368k.editorTabs()');
  const c = await hoverAndClick(k, sid, x, y, rowsRead);
  // Up to 8 s: under a load average past 100 the attack lens's own driver read the parent's file opening
  // after its 1.2 s window, in the next click's tab strip.
  let tabsAfter = await k.ev('window.__p368k.editorTabs()');
  for (let i = 0; i < 40 && !String(tabsAfter).includes(G.PATH_WORD.words); i += 1) {
    await sleep(200);
    tabsAfter = await k.ev('window.__p368k.editorTabs()');
  }
  const opened = (await k.openedSince(0)).filter((o) => String(o.url).includes('readme-elsewhere')).map((o) => cut(o.url));
  return { ...c, tabsBefore, tabsAfter, openedAnyTime: opened };
}

/** Every link word the recording sent and every drawn address on the final screen, hovered and clicked. */
async function clickLinks(k, sid, sent) {
  const rowsRead = await k.ev(`window.__p368k.rows(${J(sid)})`);
  const registered = await k.ev(`window.__p368k.registered(${J(sid)})`);
  const done = new Set();
  const clicks = [];
  for (const l of sent) {
    const at = await findWords(k, sid, rowsRead, l.words);
    if (at === null) continue;
    const x = at.x0 + Math.floor((at.x1 - at.x0) / 2);
    const key = `${String(at.y)}:${String(x)}`;
    if (done.has(key)) continue;
    done.add(key);
    clicks.push({ words: l.words.slice(0, 80), sent: cut(l.target), ...(await hoverAndClick(k, sid, x, at.y, rowsRead)) });
    // words the row does not hold whole go on to the next row (a link the agent cut): click that part too
    if (!at.whole && at.y + 1 < rowsRead.rows.length) {
      const next = await k.ev(`window.__p368k.cells(${J(sid)}, ${String(at.y + 1)})`);
      const first = (next ?? []).find(([, ch]) => ch.trim() !== '');
      if (first) {
        const x2 = first[0] + 3;
        const key2 = `${String(at.y + 1)}:${String(x2)}`;
        if (!done.has(key2)) {
          done.add(key2);
          clicks.push({ words: `${l.words.slice(0, 60)} (its next row)`, sent: cut(l.target), continuation: true, ...(await hoverAndClick(k, sid, x2, at.y + 1, rowsRead)) });
        }
      }
    }
  }
  for (let y = 0; y < rowsRead.rows.length; y += 1) {
    const links = await k.ev(`window.__p368k.linksAt(${J(sid)}, ${String(y)})`);
    for (const w of links?.web ?? []) {
      if (w.range.start.y !== rowsRead.viewportY + y + 1) continue;
      const x = w.range.start.x - 1 + Math.floor((w.range.end.x - w.range.start.x) / 2);
      const key = `${String(y)}:${String(x)}`;
      if (done.has(key)) continue;
      done.add(key);
      clicks.push({ words: w.text.slice(0, 80), sent: null, drawnAddress: true, ...(await hoverAndClick(k, sid, x, y, rowsRead)) });
    }
  }
  return { registered: (registered ?? []).map((u) => (u.length > 300 ? `${u.slice(0, 300)}…` : u)), sent: sent.map((l) => l.target), clicks };
}

/** A replay in its own session, fitted to the recording's size, stopping at `marks` for `onMark`. */
async function replay(k, name, fixtureName, agent, marks, onMark, extra = {}) {
  const fx = FIXTURES[fixtureName].fixture;
  const plan = { mode: 'replay', fixture: fixturePath(fixtureName), gate: true, marks, maxGapMs: 200, ...extra };
  const s = await k.create(name, agent, plan);
  await k.select(s.sid);
  await k.ensureVisible(s.sid, name);
  await k.fit(s.sid, fx.size.cols, fx.size.rows);
  await sleep(500);
  const pane = k.paneOf(s.sid);
  k.touch(`go-${s.sid}-start`);
  let reached = 0;
  const free = join(k.world.ctl, `free-${s.sid}`);
  for (let i = 0; i < marks.length; i += 1) {
    if (existsSync(free)) break;
    await k.waitLog(s.sid, (e) => e.ev === 'mark' && e.k === i, 60_000, `mark ${String(i)} of ${name}`);
    reached += 1;
    if (onMark) await onMark(i, s.sid, pane);
    k.touch(`go-${s.sid}-${String(i)}`);
  }
  await k.waitLog(s.sid, (e) => e.ev === 'end', 120_000, `the end of ${name}`);
  await sleep(800);
  return { sid: s.sid, pane, reached };
}

async function armD(k, which) {
  const out = {};
  const version = which === '36a' ? '3.6a' : '3.7b';
  for (const [agent, emoji, plain] of [['claude', 'claude-emoji', 'claude-plain'], ['codex', 'codex-emoji', 'codex-links']]) {
    out[agent] = {};
    for (const [slot, fixture] of [['emoji', emoji], ['plain', plain]]) {
      const marks = spreadMarks(FIXTURES[fixture].fixture, 30);
      const r = { marks: 0, asked: marks.length, differing: 0, textDiffering: 0, gaps: 0, samples: [], fixture };
      try {
        const run = await replay(k, `p368-d-${which}-${fixture}`, fixture, agent, marks, async (i, sid, pane) => {
          const c = await compareGrids(k, sid, pane, version);
          r.marks += 1;
          r.differing += c.differing;
          r.textDiffering += c.textDiffering;
          r.gaps += c.gaps;
          for (const s of c.samples) if (r.samples.length < 8) r.samples.push({ mark: i, ...s });
        });
        // the width table main named on the session's row (HEAD's D7, graded by d.<v>.<agent>.head-table):
        // null when the row names none (Unicode 6), and 'no row' or 'unread' when it could not be read, so a
        // reading that did not arrive is never taken for a row that named no table (probe review, 2026-11-16)
        r.cellWidths = await k
          .ev(`window.gmux.sessions.list().then((l) => { const s = (l || []).find((x) => x.id === ${J(run.sid)}); return s === undefined ? 'no row' : s.cellWidths !== undefined && s.cellWidths !== null ? String(s.cellWidths) : null; }).catch(() => 'unread')`)
          .catch(() => 'unread');
        // and the widths the pane's own terminal draws with (`tmux-<table>` at HEAD, '6' or 'threw' at the parent)
        r.activeVersion = await k.ev(`window.__p368k.unicodeOf(${J(run.sid)})`).catch(() => 'unread');
      } catch (e) {
        r.err = String(e?.message ?? e).slice(0, 300);
      }
      out[agent][slot] = r;
      k.note(`d ${which} ${fixture}: ${String(r.marks)} of ${String(r.asked)} marks, ${String(r.differing)} rows differing by cells (${String(r.textDiffering)} by text), ${String(r.gaps)} letters in gaps${r.err ? `, ${r.err}` : ''}`);
    }
  }
  return out;
}

/** The narrowing, the scrolled-back copies, the reporter's command; and arm d's 3.7b replays and f's links when asked. */
async function replaysMain(k, R) {
  await k.unfit();
  await k.ev(`window.__gmuxP95.openLocal(${J(k.world.proj3)}).then(() => true)`);
  const D = want('d') ? await armD(k, '37b') : null;
  if (D) R.d37 = D;
  const E = { narrow: {}, url: {}, line: {}, command: {} };
  if (want('e')) {
    // the reporter's command, Claude's own three rows, copied at a steady width while the reply is drawn
    const fx = FIXTURES['claude-plain'].fixture;
    const marks = quietBoundaries(fx).filter((i) => i >= 3 && i < fx.chunks.length - 1);
    let copied = false;
    try {
      const run = await replay(k, 'p368-e-plain', 'claude-plain', 'claude', marks, async (_i, sid) => {
        if (copied) return;
        // THE FIX ROUND: the stand-in logs a mark the moment it has WRITTEN the chunk, while tmux and the client
        // are still drawing it, and the drag below is placed by the rows read here. HEAD's client also receives
        // Claude's links (`-T hyperlinks`), so its stream is longer and settles later: in the fix round's two
        // runs HEAD's drag landed one row below the command both times, the parent's never. So the rows are read
        // until two reads 250 ms apart agree, at both builds, before the drag is placed.
        let rr = await k.ev(`window.__p368k.rows(${J(sid)})`);
        let settleReads = 1;
        for (let i = 0; i < 16; i += 1) {
          await sleep(250);
          const again = await k.ev(`window.__p368k.rows(${J(sid)})`);
          settleReads += 1;
          if (J(again.rows) === J(rr.rows)) break;
          rr = again;
        }
        const r = rr.rows.findIndex((l) => l.includes('git push origin HEAD:refs/heads/riverbend-weekend-plan'));
        if (r < 0 || r + 2 >= rr.rows.length - 1 || !rr.rows[r + 2].includes('merge_request.title=')) return;
        const start = await findWords(k, sid, rr, 'git push origin', r);
        const endCells = await k.ev(`window.__p368k.cells(${J(sid)}, ${String(r + 2)})`);
        const last = [...endCells].reverse().find(([, ch]) => ch.trim() !== '');
        if (start === null || !last) return;
        await k.drag(sid, start.x0, r, last[0], r + 2);
        // what xterm selected and what the screen held after the drag, so a copy that does not match the
        // command can be read back to its cause
        E.command.selected = await k.ev(`(() => { const p = window.__p368k.selectionPos(${J(sid)}); return p; })()`).catch(() => null);
        E.command.rowsAfter = ((await k.ev(`window.__p368k.rows(${J(sid)})`))?.rows ?? []).slice(Math.max(0, r - 1), r + 4);
        E.command.settleReads = settleReads;
        E.command.atRow = r;
        E.command.copy = await k.copy(sid);
        E.command.rows = 3;
        E.command.drawn = rr.rows.slice(r, r + 3);
        await k.ev(`window.__p368k.clearSelection(${J(sid)})`);
        copied = true;
        k.touch(`free-${sid}`);
      });
      if (!copied) E.command.err = 'the command never stood whole on the screen at a mark';
      // the narrowing: 120 to 96 columns, then ⌘A ⌘C and the Edit menu's Copy
      const from = await k.sizeStr(run.sid);
      await k.fit(run.sid, 96, fx.size.rows);
      await sleep(1500);
      const to = await k.sizeStr(run.sid);
      await k.ev(`window.__p368k.focus(${J(run.sid)})`);
      const read = await k.ev(`window.__p368k.selectAllRead(${J(run.sid)})`);
      await k.key(KEYS.cmdA);
      await sleep(200);
      const copy = await k.copy(run.sid);
      await sleep(200);
      const before = (await k.counts()).copies;
      const dom = await k.ev(`window.__p368k.editCopy(${J(run.sid)})`);
      await sleep(1200);
      const viaMain = await k.copiesSince(before);
      const editMenu = viaMain.length > 0 ? viaMain[0].text : dom?.text || null;
      const pastIn = (text) => (typeof text === 'string' ? read.past.filter((f) => text.includes(f) && !read.drawn.includes(f)) : []);
      E.narrow = { from, to, copy, drawn: read.drawn, xterm: read.xterm, past: read.past.slice(0, 12), pastInCopy: pastIn(copy), editMenu, editMenuVia: viaMain.length > 0 ? 'main' : 'dom', pastInEditMenu: pastIn(editMenu), domPrevented: dom?.prevented ?? null };
      await k.ev(`window.__p368k.clearSelection(${J(run.sid)})`);
    } catch (e) {
      E.narrow.err = String(e?.message ?? e).slice(0, 300);
    }
  }
  if (want('e') || want('f')) {
    // Codex's linked reply: f's clicks on the live screen, then e's copies while scrolled back
    try {
      const run = await replay(k, 'p368-ef-codex', 'codex-links', 'codex', [], null, { tail: TAIL_LINES });
      if (want('f')) R.fCodex = await clickLinks(k, run.sid, oscLinks(FIXTURES['codex-links'].fixture));
      if (want('e')) {
        // the reply scrolls up into the history, so its rows come back into view drawn by the scrollback
        k.touch(`go-${run.sid}-tail`);
        await k.waitLog(run.sid, (e) => e.ev === 'tail', 15_000, "the Codex pane's tail");
        await sleep(800);
        E.url = await parkedCopies(k, run.sid, G.E_URL, 'https://example.net/aaaaaaaaaa', true);
      }
    } catch (e) {
      E.url.err = String(e?.message ?? e).slice(0, 300);
    }
  }
  if (want('e')) {
    try {
      const s = await k.create('p368-e-line', 'claude', { mode: 'lines', lines: SHELL_LINES, gate: true });
      await k.select(s.sid);
      await k.ensureVisible(s.sid, 'the shell line');
      await k.fit(s.sid, 120, 30);
      k.touch(`go-${s.sid}-start`);
      await k.waitLog(s.sid, (e) => e.ev === 'end', 15_000, 'the shell line');
      await sleep(600);
      E.line = await parkedCopies(k, s.sid, G.E_SHELL_LINE, '$ git push origin HEAD:refs/heads/p368-weekend-plan', false);
    } catch (e) {
      E.line.err = String(e?.message ?? e).slice(0, 300);
    }
  }
  if (want('e')) R.e = E;
  if (want('f')) {
    try {
      const run = await replay(k, 'p368-f-claude', 'claude-links', 'claude', [], null);
      R.fClaude = await clickLinks(k, run.sid, oscLinks(FIXTURES['claude-links'].fixture));
    } catch (e) {
      R.fClaude = { err: String(e?.message ?? e).slice(0, 300) };
    }
    try {
      const s = await k.create('p368-f-hostile', 'claude', { mode: 'lines', lines: HOSTILE_LINES, gate: true });
      await k.select(s.sid);
      await k.ensureVisible(s.sid, 'the hostile targets');
      await k.fit(s.sid, 120, 30);
      k.touch(`go-${s.sid}-start`);
      await k.waitLog(s.sid, (e) => e.ev === 'end', 15_000, 'the hostile targets');
      await sleep(800);
      const rowsRead = await k.ev(`window.__p368k.rows(${J(s.sid)})`);
      const out = [];
      for (const [key, target, words] of HOSTILE) {
        const at = await findWords(k, s.sid, rowsRead, words);
        if (at === null) {
          out.push({ key, sentLen: target.length, notDrawn: true, opened: [] });
          continue;
        }
        const c = await hoverAndClick(k, s.sid, at.x0 + 1, at.y, rowsRead);
        out.push({ key, sent: target.length > 300 ? `${target.slice(0, 300)}…` : target, sentLen: target.length, ...c, target: c.target, opened: c.opened });
      }
      R.fHostile = { items: out, registered: ((await k.ev(`window.__p368k.registered(${J(s.sid)})`)) ?? []).length };
      // The fix round's rows: each cut-looking link clicked on both its rows, then the path word, last,
      // because the editor its click opens takes room from the pane.
      const cutRead = {};
      for (const r of G.CUT_ROWS) {
        const y1 = rowsRead.rows.findIndex((t) => t.startsWith(`${r.key}:`));
        if (y1 < 0 || y1 + 1 >= rowsRead.rows.length || rowsRead.cols !== CUT_COLS) {
          cutRead[r.key] = { err: `not drawn at ${String(CUT_COLS)} columns (row ${String(y1)}, ${String(rowsRead.cols)} columns)` };
          continue;
        }
        const first = await hoverAndClick(k, s.sid, rowsRead.cols - 1 - Math.floor(r.first.length / 2), y1, rowsRead);
        const second = await hoverAndClick(k, s.sid, 3, y1 + 1, rowsRead);
        cutRead[r.key] = { first, second, drawn: [rowsRead.rows[y1].slice(-40), (rowsRead.rows[y1 + 1] ?? '').slice(0, 40)] };
      }
      const py = rowsRead.rows.findIndex((t) => t.startsWith(`${G.PATH_WORD.key}: `));
      const pathword = py < 0 ? null : await clickPathWord(k, s.sid, `${G.PATH_WORD.key}: `.length + 3, py, rowsRead);
      R.fRows = { cut: cutRead, pathword };
      if (await k.ev('!!document.querySelector(".ed-panel")').catch(() => false)) {
        await k.menu('toggle-editor');
        await sleep(800);
      }
    } catch (e) {
      R.fHostile = { err: String(e?.message ?? e).slice(0, 300) };
    }
  }
}

/**
 * Scroll the view back until `head`'s rows, which sit in the pane's history, come into view near the top
 * (so the scrollback draws them, rather than moving rows the screen already held with their wrap marks),
 * then copy them: a drag that does not scroll and, for the URL, ⌘A, a double and a triple click.
 */
async function parkedCopies(k, sid, whole, head, withAll) {
  const out = { parked: false };
  const pane = k.paneOf(sid);
  if (pane === null) throw new Unreadable(`no pane for ${sid}`);
  const history = Number(String(k.tmux('display-message', '-p', '-t', pane, '#{history_size}').stdout ?? '').trim());
  const all = String(k.tmux('capture-pane', '-p', '-S', '-', '-E', '-', '-t', pane).stdout ?? '').split('\n');
  let at = -1;
  for (let j = all.length - 1; j >= 0; j -= 1) {
    if (all[j].includes(head)) {
      at = j;
      break;
    }
  }
  if (at < 0) throw new Unreadable(`${head} is not in the pane`);
  const above = history - at;
  if (!(above > 0)) throw new Unreadable(`${head} is still on the live screen (history ${String(history)}, row ${String(at)}); it is read scrolled back into view`);
  const lines = above + 4;
  const by = JSON.parse(await k.ev(`window.__gmuxP95.by(${J(sid)}, ${String(lines)}).then((r) => JSON.stringify(r))`));
  // This scroll went to MAIN through the bridge, not through the pane's own
  // scroll surface, so the window learns the pane is parked only at the
  // surface's next poll (LIVE_POLL_MS, 1,000 ms, in src/renderer/terminal/
  // scroll/surface.ts); a person's wheel goes through the surface and needs no
  // wait. A gesture made before that poll is read as live and stays xterm's
  // own, which is what the integrator measured: at 900 ms the drag from the
  // first column copied the long line as three lines in three runs, and at
  // 1,600 ms it copied it whole (build/p368/SPEC.md §As built).
  await sleep(1600);
  out.scroll = { history, row: at, lines, ok: by.ok, position: by.state?.position ?? null, inMode: by.state?.inMode ?? null };
  const rr = await k.ev(`window.__p368k.rows(${J(sid)})`);
  const r = rr.rows.findIndex((l) => l.includes(head));
  if (r < 0 || r + 1 >= rr.rows.length) throw new Unreadable(`${head} is not on the scrolled-back screen`);
  out.parked = by.ok === true && (by.state?.position ?? 0) > 0;
  out.wrappedFlagOfNextRow = rr.wrapped[r + 1];
  let lastRow = r;
  while (lastRow + 1 < rr.rows.length && (rr.rows[lastRow].length >= rr.cols - 1 || rr.wrapped[lastRow + 1]) && lastRow - r < 4) lastRow += 1;
  const start = await findWords(k, sid, rr, head.slice(0, 20), r);
  const endCells = await k.ev(`window.__p368k.cells(${J(sid)}, ${String(lastRow)})`);
  const last = [...endCells].reverse().find(([, ch]) => ch.trim() !== '');
  out.rows = rr.rows.slice(r, lastRow + 1);
  await k.drag(sid, start.x0, r, last[0], lastRow);
  out.dragSelection = await k.ev(`(() => { const t = window.__p368k; return t.selection(${J(sid)}); })()`).catch(() => null);
  out.drag = await k.copy(sid);
  out.dragComposed = k.lastCopy;
  await k.ev(`window.__p368k.clearSelection(${J(sid)})`);
  await sleep(300);
  if (start.x0 === 0) {
    // the same drag from the row's third cell, so a reading can tell a start at the first column apart
    await k.drag(sid, 2, r, last[0], lastRow);
    out.dragFrom2 = await k.copy(sid);
    out.dragFrom2Composed = k.lastCopy;
    await k.ev(`window.__p368k.clearSelection(${J(sid)})`);
    await sleep(300);
  }
  if (withAll) {
    await k.ev(`window.__p368k.focus(${J(sid)})`);
    await k.key(KEYS.cmdA);
    await sleep(300);
    out.all = await k.copy(sid);
    out.allComposed = k.lastCopy;
    await k.ev(`window.__p368k.clearSelection(${J(sid)})`);
    await sleep(300);
    const mid = start.x0 + 12;
    await k.clicks(sid, mid, r, 2);
    out.dbl = await k.copy(sid);
    out.dblComposed = k.lastCopy;
    await k.ev(`window.__p368k.clearSelection(${J(sid)})`);
    await sleep(300);
    await k.clicks(sid, mid, r, 3);
    out.triple = await k.copy(sid);
    out.tripleComposed = k.lastCopy;
    await k.ev(`window.__p368k.clearSelection(${J(sid)})`);
  }
  const back = JSON.parse(await k.ev(`window.__gmuxP95.live(${J(sid)}).then((r) => JSON.stringify(r))`));
  out.backLive = back.ok === true;
  await sleep(500);
  return out;
}

// ---------------------------------------------------------------------------
// One launch.
// ---------------------------------------------------------------------------

async function launch(build, kind, checkout, readings, run) {
  const world = makeWorld(build, kind);
  const tmuxBin = kind === 't36' ? TMUX_36A : join(checkout, 'build', 'vendor', 'tmux', 'bin', 'tmux');
  const L = { build, kind, checkout, census: 'not read', world: world.root };
  run.launches.push(L);
  if (!existsSync(tmuxBin)) {
    L.census = 'not launched';
    throw new Unreadable(`(${build} ${kind}) no tmux at ${tmuxBin}`);
  }
  if (kind === 't36') {
    const v = String(spawnSync(tmuxBin, ['-V'], { encoding: 'utf8', env: TMUX_ENV }).stdout ?? '').trim();
    if (v !== 'tmux 3.6a') {
      L.census = 'not launched';
      throw new Unreadable(`(${build} ${kind}) ${tmuxBin} says ${J(v)}, not tmux 3.6a`);
    }
  }
  const pre = hidden.hiddenAgentsPrecheck({ checkout, prefix: 'p368', home: world.home, userPath: world.path, standIns: ['claude', 'codex'] });
  L.precheck = { ok: pre.ok, said: pre.said };
  if (!pre.ok) {
    L.census = 'not launched';
    throw new Fatal(`(${build}) ${checkout}'s own overlay parser does not hide every probed row but claude and codex: ${pre.said}`);
  }
  hidden.writeHiddenAgents(world.profile, 'p368', hidden.hiddenAgentsBesides(['claude', 'codex']));
  say(`(${build} ${kind}) launching ${checkout} with ${tmuxBin}`);
  const R = readings;
  // withElectron THROWS a census failure when the body returned, and only PRINTS one when the body threw
  let bodyReturned = false;
  try {
    await withElectron(
      {
        label: `p368-${build}-${kind}`,
        userDataDir: world.profile,
        tmuxSocket: socket,
        cwd: checkout,
        program: 'app',
        args: ['--remote-debugging-port=0', '--inspect=0', '--use-mock-keychain', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
        env: withoutDevRenderer({
          ...STRIPPED,
          HOME: world.home,
          ZDOTDIR: world.home,
          HISTFILE: '/dev/null',
          // /bin/sh for every start but a restore's holder, which is the size-watching stand-in (makeWorld)
          SHELL: world.shell,
          PATH: world.path,
          LANG: 'en_US.UTF-8',
          LC_CTYPE: 'en_US.UTF-8',
          GMUX_TMUX_SOCKET: socket,
          GMUX_PROBES: '1',
          GMUX_TMUX_BIN: tmuxBin,
          GMUX_CONFIG_ROOT: join(world.profile, 'gmux', 'config'),
          GMUX_SPECSTORY_NO_CLOUD: '1'
        }),
        graceMs: 8000,
        ceilingMs: 50 * 60 * 1000
      },
      async (handle) => {
        const main = await cdpForMain(handle, 90_000);
        let cdp = null;
        try {
          await main.call('Runtime.enable');
          // The window first (its drives answering means main has loaded and registered its handlers), then
          // main's recorders, and only then anything that clicks or copies.
          cdp = await cdpForApp(world.profile, 120_000);
          let patched = null;
          for (let i = 0; i < 20 && patched === null; i += 1) {
            try {
              patched = JSON.parse((await mainEval(main, MAIN_PATCH)) ?? 'null');
            } catch (e) {
              if (i === 19) throw new Fatal(`(${build}) main's recorders could not be put in place: ${String(e?.message ?? e)}`);
              await sleep(500);
            }
          }
          R.patched = patched;
          if (!(patched?.openExternal && patched?.writeRich && patched?.clipboard)) throw new Fatal(`(${build}) main's recorders could not be put in place: ${J(patched)}`);
          await cdp.call('Runtime.enable');
          try {
            await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true });
          } catch {
            /* reads still work without it */
          }
          const k = makeKit({ cdp, main, world, tmuxBin, build, kind });
          let scan = null;
          try {
            scan = JSON.parse(await cdpEval(cdp, hidden.AGENTS_LIST_EXPR, 90_000));
          } catch {
            scan = null;
          }
          const verdict = hidden.standInsOnlyVerdict(scan, { standIns: ['claude', 'codex'], under: world.bin });
          L.agents = verdict.said;
          k.note(`agents: ${verdict.said}`);
          if (!verdict.ok) throw new Fatal(`(${build}) the app's own detection resolved more than the stand-ins: ${verdict.said}`);
          await k.ev(KIT);
          if (kind === 't36') {
            await k.mev(MAIN_WINDOW('w.setSize(1300, 820); await new Promise((r) => setTimeout(r, 800)); return true;'));
            R.tmuxVersion36 = String(k.tmux('display-message', '-p', '#{version}').stdout ?? '').trim();
            await k.ev(`window.__gmuxP95.openLocal(${J(world.proj3)}).then(() => true)`);
            R.d36 = await armD(k, '36a');
            L.notes = k.notes;
            bodyReturned = true;
            return;
          }
          let ids = null;
          if (want('a') || want('b') || want('c')) ids = await setup(k, R);
          if (want('a')) {
            try {
              R.a = await armA(k, ids);
            } catch (e) {
              if (e instanceof Fatal) throw e;
              R.a = { err: String(e?.message ?? e).slice(0, 300) };
              await k.mev(MAIN_RELEASE_RESIZE).catch(() => undefined);
            }
          }
          if (want('b') || want('c')) {
            try {
              R.census = await census(k, ids, R, !want('c'));
            } catch (e) {
              if (e instanceof Fatal) throw e;
              R.census = { err: String(e?.message ?? e).slice(0, 300) };
            }
          }
          if (want('b')) {
            try {
              R.b3 = await armB3(k);
            } catch (e) {
              if (e instanceof Fatal) throw e;
              R.b3 = { err: String(e?.message ?? e).slice(0, 300) };
              await k.unfit().catch(() => undefined);
            }
          }
          if (want('d') || want('e') || want('f')) await replaysMain(k, R);
          R.confirms = (await k.ev('window.__p368k.rec.confirms').catch(() => null)) ?? null;
          R.pageClipboard = (await k.ev('window.__p368k.rec.clip').catch(() => null)) ?? null;
          R.mainRecorder = JSON.parse((await mainEval(main, `JSON.stringify({ opened: globalThis.__p368m.rec.opened.map((o) => o.url.slice(0, 200)), paths: globalThis.__p368m.rec.paths, clipboard: globalThis.__p368m.rec.clipboard.length, copies: globalThis.__p368m.rec.copies.length })`)) ?? 'null');
          L.notes = k.notes;
          bodyReturned = true;
        } finally {
          // the app's own last lines, for a reader of the report (the scratch world's paths only)
          L.appTail = handle
            .text()
            .split('\n')
            .filter((l) => /\b(warn|error|refus|fail|restor|attach)/i.test(l))
            .slice(-60)
            .map((l) => l.slice(0, 300));
          try {
            cdp?.close();
          } catch {
            /* closed */
          }
          try {
            main.close();
          } catch {
            /* closed */
          }
        }
      }
    );
    L.census = 'passed';
  } catch (err) {
    const msg = String(err?.message ?? err);
    L.census = bodyReturned ? `failed: ${msg.slice(0, 300)}` : `not read, the launch's body ended first (${msg.slice(0, 160)})`;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// From readings to the graders' shapes.
// ---------------------------------------------------------------------------

function shape(R) {
  const out = {};
  if (R.a) out.a = R.a;
  if (R.census && !R.census.err) {
    out.c = { rows: R.census.rows, order: R.census.order };
    out.b = { fresh: R.newRow ? { start: R.newRow.start, later: R.newRow.later, fitted: R.newRow.fitted } : null, restored: R.census.restored };
  } else if (R.census?.err) {
    out.c = { err: R.census.err };
    out.b = { err: R.census.err };
  }
  if (R.b3) out.b = { ...(out.b ?? {}), replay: R.b3 };
  if (R.d37 || R.d36) out.d = { '3.7b': R.d37 ?? null, '3.6a': R.d36 ?? null };
  if (R.e) out.e = R.e;
  if (R.fClaude || R.fCodex || R.fHostile) {
    const agent = (x) => (x && !x.err ? { registered: x.registered, sent: x.sent, clicks: x.clicks } : x);
    out.f = { patched: R.patched ?? null, claude: agent(R.fClaude), codex: agent(R.fCodex), hostile: R.fHostile?.items ?? [], rows: R.fRows ?? null };
  }
  return out;
}

// ---------------------------------------------------------------------------
// RUN: his history, the reports folder, the sockets and the process table.
// ---------------------------------------------------------------------------

const REAL_HOME = userInfo().homedir;
function historyStats() {
  const out = {};
  for (const f of ['.zsh_history', '.bash_history']) {
    try {
      const s = statSync(join(REAL_HOME, f));
      out[f] = [s.size, Math.floor(s.mtimeMs / 1000)];
    } catch {
      out[f] = null;
    }
  }
  return out;
}
function reportNames() {
  const dir = join(REAL_HOME, 'Library', 'Logs', 'DiagnosticReports');
  const out = {};
  for (const sub of ['', 'Retired']) {
    let names = [];
    try {
      names = readdirSync(join(dir, sub));
    } catch {
      names = [];
    }
    for (const n of names) {
      try {
        const s = statSync(join(dir, sub, n));
        if (s.isFile()) out[`${sub === '' ? '' : `${sub}/`}${n}`] = Math.floor(s.mtimeMs / 1000);
      } catch {
        /* gone */
      }
    }
  }
  return out;
}
function socketsLeft() {
  const dir = `/private/tmp/tmux-${String(process.getuid())}`;
  let files = [];
  try {
    files = readdirSync(dir).filter((n) => n.startsWith('gmux-p368'));
  } catch {
    files = [];
  }
  const live = [];
  if (files.includes(socket)) {
    const r = spawnSync('tmux', ['-L', socket, 'list-sessions'], { encoding: 'utf8', env: TMUX_ENV, timeout: 10_000 });
    if (r.status === 0) live.push(socket);
  }
  return { files, live };
}
function leftovers() {
  const r = spawnSync('/bin/ps', ['-Ao', 'pid=,command='], { encoding: 'utf8', timeout: 10_000 });
  if (r.status !== 0) return null;
  return String(r.stdout)
    .split('\n')
    .filter((l) => l.includes(SCRATCH))
    .map((l) => l.trim().slice(0, 200));
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

const report = {
  started: new Date().toISOString(),
  parent: PARENT_DIR || null,
  head: HEAD_DIR,
  asked: ASKED,
  socket,
  tmux36: TMUX_36A,
  readings: {},
  rows: []
};
const sha = (d) => String(spawnSync('git', ['-C', d, 'rev-parse', '--short=8', 'HEAD'], { encoding: 'utf8' }).stdout ?? '').trim() || null;
report.parentSha = PARENT_DIR ? sha(PARENT_DIR) : null;
report.headSha = sha(HEAD_DIR);
const run = { history: { before: historyStats() }, reports: {}, launches: [] };
const reportsBefore = reportNames();
mkdirSync(SCRATCH, { recursive: true });
say(`parent ${PARENT_DIR || '(not given)'} at ${String(report.parentSha)}, HEAD ${HEAD_DIR} at ${String(report.headSha)}; arms ${ASKED.join(',')}; socket ${socket}`);

let fatal = null;
const raw = {};
for (const build of PARENT_DIR ? ['parent', 'head'] : ['head']) {
  if (fatal !== null) break;
  const checkout = build === 'parent' ? PARENT_DIR : HEAD_DIR;
  raw[build] = {};
  for (const kind of ['main', ...(want('d') ? ['t36'] : [])]) {
    if (kind === 'main' && !(want('a') || want('b') || want('c') || want('e') || want('f') || want('d'))) continue;
    const t = Date.now();
    try {
      await launch(build, kind, checkout, raw[build], run);
    } catch (err) {
      if (err instanceof Fatal) {
        fatal = err.message;
        break;
      }
      raw[build][`${kind}Error`] = String(err?.message ?? err).slice(0, 600);
      say(`(${build} ${kind}) the launch ended: ${String(err?.message ?? err).slice(0, 300)}`);
    }
    say(`(${build} ${kind}) done in ${String(Math.round((Date.now() - t) / 1000))} s`);
  }
}

run.history.after = historyStats();
const reportsAfter = reportNames();
run.reports.added = Object.keys(reportsAfter).filter((n) => reportsBefore[n] !== reportsAfter[n]);
run.sockets = socketsLeft();
run.leftovers = leftovers();
report.run = run;
report.raw = raw;
const readings = { parent: raw.parent ? shape(raw.parent) : undefined, head: raw.head ? shape(raw.head) : undefined, run };
report.readings = readings;
const rows = fatal === null ? G.gradeAll(readings, ASKED) : [{ arm: 'the preconditions', clause: 'fatal', ok: null, said: fatal, info: false }, ...G.gradeRun(run)];
report.rows = rows;
report.exit = G.exitCodeOf(rows);
report.ended = new Date().toISOString();
for (const r of rows) (r.ok === true ? process.stdout : process.stderr).write(`${TAG} ${r.ok === true ? 'ok  ' : r.ok === false ? 'FAIL' : r.info ? 'info' : 'UNREAD'} ${r.clause}: ${r.said}\n`);
try {
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${J(report, null, 1)}\n`);
  say(`wrote ${REPORT_PATH}`);
} catch (err) {
  say(`could not write the report: ${String(err?.message ?? err)}`);
}
if (!KEEP) rmSync(SCRATCH, { recursive: true, force: true });
else say(`KEPT ${SCRATCH}`);
const fails = rows.filter((r) => !r.info && r.ok === false).length;
const unread = rows.filter((r) => !r.info && r.ok !== true && r.ok !== false).length;
if (report.exit === 1) say(`probe:p368 FAILED: ${String(fails)} clause(s) disagree${unread > 0 ? `, and ${String(unread)} could not be read` : ''}.`);
else if (report.exit === 2) say(`probe:p368 could not READ ${String(unread)} clause(s)${HEAD_ONLY ? ' (HEAD alone, a dry run)' : ''}; that is not a pass.`);
else say(`probe:p368 PASS: ${String(rows.length)} clauses at both builds.`);
process.exit(report.exit);
