#!/usr/bin/env node
/**
 * build/p318/stand-in.mjs — the Claude Code and Codex that `probe:p318`,
 * `measure:p318` and `probe:p316`'s `reply` group answer. It is NOT an agent
 * and runs none. It draws Phase 318's COMMITTED REAL SCREENS
 * (build/fixtures/reply/, captured from Claude Code 2.1.287 and Codex 0.160.0
 * by the capture step, build/p318/SPEC.md §7.3 and §Revision R20 to R27) into
 * the pane it was launched in, and it WRITES DOWN EVERY BYTE IT READS.
 *
 * WHY A STAND-IN (build/p318/SPEC.md §0, §7.4). The phase types into a running
 * agent from outside the Mac, so its proof needs an agent that types back
 * nothing and spends nothing, whose screens are the real ones, and whose own
 * record says which question every byte answered. That record is the ground
 * truth every arm is graded on: a byte is read off this file's log, never off
 * the writer's report of what it sent.
 *
 * HOW IT IS LAUNCHED. The probe and the measurement put three files in a
 * scratch directory (`writeWrappers`): `bin/claude` and `bin/codex`, each
 * `exec -a <name> /bin/bash run-standin.sh <name> "$@"`, so the pane's own
 * program carries the agent's bare name as its program token, exactly as the
 * real one's does (`commandRunsAgent`, D13); and `run-standin.sh`, which runs
 * this file under node with `P318_AGENT` set and, when this file leaves with
 * HANDOFF_EXIT after naming a committed screen in `handoff-<pid>.txt`, execs
 * `/bin/bash -c 'cat <screen>; exec /bin/sleep …'` so a NON-AGENT program
 * holds the terminal over a numbered dialog (R12). A real Claude Code or Codex
 * is never on that PATH: the probe refuses to start unless both bare names
 * resolve to these wrappers inside the scratch login shell.
 *
 * WHAT IT ANSWERS BEFORE IT DRAWS ANYTHING, because Tortie's detection runs
 * them: `-v` and `--version` print a version carrying the identity the row's
 * probe reads (`(Claude Code)`) and the words `p318 stand-in`; `--help` exits
 * 0. Anything with no terminal on stdout exits 0 at once.
 *
 * WHAT IT DOES, per build/p318/SPEC.md §7.4:
 *   - puts its terminal in raw mode, asks for bracketed paste (ESC [ ? 2004 h)
 *     and, as Claude, focus reports (ESC [ ? 1004 h), and appends EVERY CHUNK
 *     IT READS to `reads-<pid>.jsonl` with a monotonic stamp
 *     (`process.hrtime.bigint()`, one clock for every process on this Mac),
 *     the bytes in hex, and the SERIAL and name of the screen drawn when it
 *     read them; every event it acts on (a commit, a dropped digit, a submit,
 *     a queued message, a focus change) is a line there too;
 *   - draws a press shape (Claude Code's Bash prompt, Codex's command
 *     approval) built from the committed real screen with the command named
 *     in its op; commits on a digit that is one of its markers, never on
 *     Enter; as Claude, DROPS a digit read in the first 200 ms after it drew
 *     (research 135 §2.2); and draws the next screen about 60 ms after a
 *     commit when its op says so;
 *   - as Claude, writes `$HOME/.claude/sessions/<pid>.json` (`idle`, `busy`,
 *     `waiting`) the way Claude Code does, and POSTs `PermissionRequest`
 *     (about 20 ms BEFORE it draws the dialog, as 2.1.287 does), `PostToolUse`,
 *     `UserPromptSubmit` and `Stop` to the hook URLs in the `--settings` file
 *     its own argv names, each body in the real body's shape
 *     (`claude-permission-requests-2.1.287.json`);
 *   - as Codex, sets its title by OSC 2: the folder's name at rest, a braille
 *     frame while it works, and at an approval `[ ! ] Action Required | <dir>`
 *     alternating with `[ . ] Action Required | <dir>`, as 0.160.0 does (R24),
 *     and draws the terminal's own cursor at the first column after `› `;
 *   - echoes what is typed at its own prompt (a draft at the Mac draws as one,
 *     in the agent's own style), takes a bracketed paste into the prompt, and
 *     SUBMITS on a carriage return outside a paste, writing `submitted` with
 *     the bytes; in `work` it queues a submit and submits at the turn's end,
 *     writing both, as the agents do; what it submitted is echoed RAW above
 *     its prompt, a row a line, so a dialog-shaped message draws a
 *     dialog-shaped screen (R16, the worst case for the Mac's screen verdict);
 *   - hands its terminal to `/bin/cat` of a committed screen for the
 *     false-choice arm (above), the sleeper after it ended by the probe by pid.
 *
 * HOW IT IS TOLD. It writes `hello-<pid>.json` into `P318_STANDIN_DIR`, then
 * reads `cmd-<pid>.json` there every 25 ms: `{ seq, ops }`, each new `seq`
 * applied once and in order, and after each it writes `state-<pid>.json`. The
 * ops are `OPS` below.
 *
 * WHAT IT NEVER DOES. It never runs the command a screen names, never writes
 * anything but its screens, its log, its state and (as Claude) its registry
 * file, reads nothing but this checkout's committed screens, its own
 * directory and the `--settings` file its argv names, and dials 127.0.0.1 and
 * nothing else. It ends when told to, on SIGHUP, SIGTERM or SIGINT, when its
 * directory is removed, or after `P318_STANDIN_CEILING_MS` (45 minutes).
 *
 * THE PROBE AND THE MEASUREMENT IMPORT IT TOO, for the screen loader, the
 * screen builders, the wrapper writer and the log reader, so all three read
 * one spelling of each. Importing it runs nothing.
 */

import { appendFileSync, chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const STANDIN_PATH = fileURLToPath(import.meta.url);
export const REPLY_FIXTURES = join(ROOT, 'build', 'fixtures', 'reply');
/** The agents this file stands in for, by registry id; each is its own bare name. */
export const STAND_IN_AGENTS = Object.freeze(['claude', 'codex']);
/** The exit that asks run-standin.sh to hand the terminal to a non-agent program. */
export const HANDOFF_EXIT = 77;
/** Claude Code drops a digit read this soon after it drew (research 135 §2.2). */
export const CLAUDE_DROP_MS = 200;
/** The next screen after a commit, when an op asks for one (§7.4). */
export const AFTER_COMMIT_MS = 60;
/** The hook leads the dialog by about this much (2.1.287 measured 12 to 45 ms; research 135 §2.6 10 to 25). */
export const HOOK_LEAD_MS = 20;

const VERSION = {
  claude: '2.1.287 (Claude Code) p318 stand-in',
  codex: 'codex-cli 0.160.0 (p318 stand-in)'
};

// ---------------------------------------------------------------------------
// The committed screens
// ---------------------------------------------------------------------------

/** A committed reply fixture's rows: line 1 (its source) dropped, `.ansi` decoded. */
export function loadReplyFixture(name) {
  if (!/^[a-z0-9][a-z0-9.-]*\.(?:txt|ansi)$/.test(String(name))) return null;
  const path = join(REPLY_FIXTURES, name);
  if (!existsSync(path)) return null;
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.shift();
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return name.endsWith('.ansi') ? lines.map(decodeAnsiLine) : lines;
}

/** `\\` and `\xNN` back to their bytes (the capture step's own encoding, §7.3). */
export function decodeAnsiLine(line) {
  return line.replace(/\\(\\|x[0-9a-f]{2})/g, (_, g) => (g === '\\' ? '\\' : String.fromCharCode(parseInt(g.slice(1), 16))));
}

/** A row with its SGR and every other CSI removed. */
export const stripAnsi = (row) => String(row).replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '').replace(/\u001b\][^\u0007]*\u0007/g, '');

/** The real committed manifest (`real-captures.json`), or null. */
export function realCaptures() {
  try {
    return JSON.parse(readFileSync(join(REPLY_FIXTURES, 'real-captures.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** The real PermissionRequest bodies Claude Code 2.1.287 posted, in claude-bash-* order. */
export function realHookBodies() {
  try {
    return JSON.parse(readFileSync(join(REPLY_FIXTURES, 'claude-permission-requests-2.1.287.json'), 'utf8')).bodies ?? [];
  } catch {
    return [];
  }
}

/** Trailing blank rows dropped (a capture is padded to the pane's height). */
function trimmed(rows) {
  const out = [...rows];
  while (out.length > 0 && stripAnsi(out[out.length - 1]).trim() === '') out.pop();
  return out;
}

/**
 * Claude Code 2.1.287's Bash prompt for `command`, built from the real
 * one-line capture: the `⏺ Bash(…)` row and the command inside the dashed box
 * replaced, a command of several lines drawn one row each behind the box's
 * own indent, and `folder` written into option 2 where the capture's scratch
 * folder was. The rows below the box (the question, the four options, the
 * hint) are the real capture's, byte for byte.
 */
export function claudeBashScreen(command, folder = '/private/tmp/p318-project') {
  const rows = trimmed(loadReplyFixture('claude-bash-2.1.287.txt') ?? []);
  const real = 'touch p318-one.txt';
  const lines = String(command).split('\n');
  const out = [];
  let inBox = 0;
  for (const row of rows) {
    if (row.startsWith('⏺ Bash(')) {
      out.push(`⏺ Bash(${lines[0]}${lines.length > 1 ? ' …' : ''})`);
      continue;
    }
    if (/^╌{20,}/.test(row)) {
      inBox += 1;
      out.push(row);
      continue;
    }
    if (inBox === 1 && row.trim() === real) {
      for (const l of lines) out.push(` ${l}`);
      continue;
    }
    out.push(row.replace(/\/private\/tmp\/p318cap-claude-\d+\/proj-claude/g, folder));
  }
  return out;
}

/**
 * Codex 0.160.0's command approval for `command`, built from the real capture
 * with no Reason row: the `• Running` row and the `$ ` row replaced, every
 * later line of a multi-line command drawn UNPREFIXED at the `$` row's indent
 * and a blank line as a blank row (R20), and the option-2 prefix written as
 * Codex writes it. `twoOptions` leaves "don't ask again" out, as Codex does for
 * some commands (R25).
 */
export function codexApprovalScreen(command, { twoOptions = false } = {}) {
  const rows = trimmed(loadReplyFixture('codex-approval-no-reason-0.160.0.txt') ?? []);
  const real = 'touch p318-plain.txt';
  const lines = String(command).split('\n');
  const out = [];
  for (const row of rows) {
    if (row.startsWith('• Running ')) {
      out.push(`• Running ${lines[0]}`);
      continue;
    }
    if (row.trim() === `$ ${real}`) {
      const indent = row.slice(0, row.indexOf('$'));
      out.push(`${indent}$ ${lines[0]}`);
      for (const l of lines.slice(1)) out.push(l === '' ? '' : `${indent}${l}`);
      continue;
    }
    if (row.includes("don't ask again for commands that start with")) {
      if (twoOptions) continue;
      out.push(row.replace(`\`${real}\``, `\`${lines[0].split(' ')[0]}\``));
      continue;
    }
    if (twoOptions && /^\s+3\. No, and tell Codex/.test(row)) {
      out.push(row.replace('3. No', '2. No'));
      continue;
    }
    out.push(row.replace(/P318-PLAIN run the command the stand-in names/, 'P318 run the command the stand-in names'));
  }
  return out;
}

/** The idle screen, the real capture: Claude's focused (caret) or blurred (none); Codex's with its placeholder. */
export function idleScreen(agent, { focused = true } = {}) {
  if (agent === 'claude') return trimmed(loadReplyFixture(focused ? 'claude-prompt-empty-2.1.287.ansi' : 'claude-prompt-empty-blurred-2.1.287.ansi') ?? []);
  return trimmed(loadReplyFixture('codex-prompt-empty-0.160.0.ansi') ?? []);
}

/** The prompt row of an idle screen: Claude's last `❯` row between two rules, Codex's last `› ` row that is no option. */
export function promptRowOf(agent, rows) {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const plain = stripAnsi(rows[i]).replace(/^\s+/, '');
    if (agent === 'claude' && plain.startsWith('❯') && i > 0 && i < rows.length - 1 && /─{10,}/.test(stripAnsi(rows[i - 1])) && /─{10,}/.test(stripAnsi(rows[i + 1]))) return i;
    if (agent === 'codex' && plain.startsWith('› ') && !/^› \d+\./.test(plain)) return i;
  }
  return -1;
}

/**
 * An idle screen with `typed` in its prompt row, drawn the agent's way: Claude
 * Code a default-colour draft with its inverse caret after it (when focused),
 * a multi-line text one row each inside the rules; Codex a draft after its
 * bold `›`, its continuation rows indented two (R23, R24). Answers the rows
 * and, for Codex, the cursor (0-based) the terminal's own cursor goes to.
 */
export function withPrompt(agent, rows, typed, { focused = true } = {}) {
  const at = promptRowOf(agent, rows);
  if (at === -1) return { rows, cursor: null };
  const lines = String(typed).split(/\r\n|\r|\n/);
  const out = [...rows.slice(0, at)];
  let cursor = null;
  if (agent === 'claude') {
    lines.forEach((l, i) => {
      const last = i === lines.length - 1;
      out.push(`${i === 0 ? '\u001b[39m❯ ' : '  '}${l}${last && focused ? '\u001b[7m \u001b[0m' : ''}`);
    });
  } else {
    lines.forEach((l, i) => {
      out.push(`${i === 0 ? '\u001b[1m›\u001b[0m ' : '  '}${l}`);
      if (i === lines.length - 1) cursor = { x: 2 + [...l].length, y: at + i };
    });
  }
  out.push(...rows.slice(at + 1));
  return { rows: out, cursor };
}

/** Cells a code point takes, as a terminal counts them. */
function cellWidth(cp) {
  if (cp >= 0x1100 && cp <= 0x115f) return 2;
  if (cp >= 0x2e80 && cp <= 0xa4cf) return 2;
  if (cp >= 0xac00 && cp <= 0xd7a3) return 2;
  if (cp >= 0xf900 && cp <= 0xfaff) return 2;
  if (cp >= 0xff00 && cp <= 0xff60) return 2;
  if (cp >= 0x1f300 && cp <= 0x1faff) return 2;
  return 1;
}

/** One row cut to `cols` cells, its escape sequences kept whole and never counted. */
export function clipRow(row, cols) {
  let used = 0;
  let out = '';
  const re = /\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007]*\u0007|[\s\S]/gu;
  for (const m of String(row).matchAll(re)) {
    const tok = m[0];
    if (tok.startsWith('\u001b')) {
      out += tok;
      continue;
    }
    const w = cellWidth(tok.codePointAt(0) ?? 32);
    if (used + w > cols) break;
    out += tok;
    used += w;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The wrappers, and the log
// ---------------------------------------------------------------------------

/**
 * The three files a scratch PATH needs: `bin/claude`, `bin/codex` and
 * `run-standin.sh` in `dir`. Answers their paths. The wrapper names the agent
 * as its program token (`exec -a`), and the runner hands the terminal to a
 * non-agent program only when this file asks it to.
 */
export function writeWrappers({ dir, bin = join(dir, 'bin'), node = process.execPath, standinDir }) {
  mkdirSync(bin, { recursive: true });
  const runner = join(dir, 'run-standin.sh');
  writeFileSync(
    runner,
    [
      '#!/bin/bash',
      '# build/p318/stand-in.mjs\'s runner. Not Claude Code and not Codex: it runs the stand-in, and when the',
      `# stand-in leaves with ${String(HANDOFF_EXIT)} after naming a committed screen, hands the terminal to cat (R12).`,
      'agent="$1"; shift',
      `export P318_STANDIN_DIR=${JSON.stringify(standinDir)}`,
      `P318_AGENT="$agent" ${JSON.stringify(node)} ${JSON.stringify(STANDIN_PATH)} "$@"`,
      'code=$?',
      `if [ "$code" = "${String(HANDOFF_EXIT)}" ] && [ -f "$P318_STANDIN_DIR/handoff-$$.txt" ]; then`,
      '  screen="$(cat "$P318_STANDIN_DIR/handoff-$$.txt")"',
      '  exec /bin/bash -c "printf \'\\033[H\\033[2J\'; /bin/cat \\"$screen\\"; exec /bin/sleep 3600"',
      'fi',
      'exit "$code"',
      ''
    ].join('\n'),
    'utf8'
  );
  chmodSync(runner, 0o755);
  const out = { runner };
  for (const agent of STAND_IN_AGENTS) {
    const path = join(bin, agent);
    writeFileSync(path, `#!/bin/bash\n# probe:p318. Not ${agent === 'claude' ? 'Claude Code' : 'Codex'}: build/p318/stand-in.mjs under the bare name.\nexec -a ${agent} /bin/bash ${JSON.stringify(runner)} ${agent} "$@"\n`, 'utf8');
    chmodSync(path, 0o755);
    out[agent] = path;
  }
  return out;
}

/** Tell one stand-in: its next `seq` and the ops, in order. */
export function sendOps(standinDir, pid, seq, ops) {
  writeFileSync(join(standinDir, `cmd-${String(pid)}.json`), JSON.stringify({ seq, ops }));
}

/** A stand-in's log: every line of `reads-<pid>.jsonl` parsed, `t` as a BigInt. */
export function readLog(standinDir, pid) {
  let text = '';
  try {
    text = readFileSync(join(standinDir, `reads-${String(pid)}.jsonl`), 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      const o = JSON.parse(line);
      o.t = BigInt(o.t);
      out.push(o);
    } catch {
      /* a line cut by a read racing the append; the next read has it whole */
    }
  }
  return out;
}

/** The bytes a stand-in read, in order, as one Buffer (the chunks after `fromT`, when given). */
export function bytesRead(log, fromT = null) {
  return Buffer.concat(log.filter((l) => l.kind === 'read' && (fromT === null || l.t >= fromT)).map((l) => Buffer.from(l.hex, 'hex')));
}

/** A stand-in's state file, or null. */
export function readState(standinDir, pid) {
  try {
    return JSON.parse(readFileSync(join(standinDir, `state-${String(pid)}.json`), 'utf8'));
  } catch {
    return null;
  }
}

/** Every stand-in that said hello in this directory: `{ pid, agent, session, pane }`. */
export function hellos(standinDir) {
  const out = [];
  let names = [];
  try {
    names = readdirSync(standinDir);
  } catch {
    return out;
  }
  for (const n of names) {
    const m = /^hello-(\d+)\.json$/.exec(n);
    if (m === null) continue;
    try {
      out.push(JSON.parse(readFileSync(join(standinDir, n), 'utf8')));
    } catch {
      /* half written; the next look has it */
    }
  }
  return out;
}

/**
 * The press frames a log holds: for every `commit` event, the screen serial
 * it was read under and the marker. The probe's ground truth for "which
 * question did this byte answer".
 */
export const commitsOf = (log) => log.filter((l) => l.kind === 'commit');
/** Every message a stand-in submitted, its bytes as hex, in order. */
export const submitsOf = (log) => log.filter((l) => l.kind === 'submitted');

// ---------------------------------------------------------------------------
// The stand-in itself, run only when this file is the entry point
// ---------------------------------------------------------------------------

const ESC = '\u001b';
const BRAILLE = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * OPS. Each is one object in a `cmd-<pid>.json`'s `ops`:
 *   { op: 'idle', focused? }            the agent's own empty prompt; Claude
 *                                       `idle` in its registry, Codex titled
 *                                       with the folder's name
 *   { op: 'press', command, shape?, onCommit?, twoOptions?, noHook?, dropMs? }
 *                                       a press screen for `command`: Claude's
 *                                       Bash prompt (its PermissionRequest
 *                                       first, HOOK_LEAD_MS before the draw),
 *                                       or Codex's approval; `onCommit` is the
 *                                       op drawn AFTER_COMMIT_MS after a
 *                                       commit (default `{ op: 'idle' }`);
 *                                       `dropMs` widens the window in which a
 *                                       digit is dropped (Claude's own is
 *                                       CLAUDE_DROP_MS, Codex's none), so
 *                                       measure:p318's M5 can type a digit the
 *                                       agent does not take, every time
 *   { op: 'screen', fixture, waiting? } a committed screen drawn as it is (a
 *                                       Claude trust gate, a numbered dialog);
 *                                       `waiting` makes the agent's own reader
 *                                       say it waits (registry, title)
 *   { op: 'work', ms, then? }           working for `ms` (Claude `busy` with a
 *                                       spinner row, Codex a braille title),
 *                                       then `then` (default idle); a message
 *                                       pasted meanwhile is QUEUED and
 *                                       submitted at the turn's end
 *   { op: 'afterSubmit', then }         what a submit leads to (default:
 *                                       `{ op: 'work', ms: 400 }`)
 *   { op: 'handoff', fixture, hookFirst? }
 *                                       leave with HANDOFF_EXIT so the runner
 *                                       hands the terminal to cat of it; as
 *                                       Claude, `hookFirst` posts that
 *                                       command's PermissionRequest first (R12)
 *   { op: 'clear' }                     forget the echoed transcript
 *   { op: 'exit' }                      leave
 */
async function standIn() {
  const agent = process.env['P318_AGENT'] ?? '';
  const args = process.argv.slice(2);
  if (args.includes('--version') || args.includes('-v') || args.includes('-V')) {
    process.stdout.write(`${VERSION[agent] ?? 'p318 stand-in'}\n`);
    return 0;
  }
  if (args.includes('--help') || args.includes('-h')) return 0;
  const DIR = process.env['P318_STANDIN_DIR'] ?? '';
  if (!process.stdout.isTTY || DIR === '' || !existsSync(DIR) || !STAND_IN_AGENTS.includes(agent)) return 0;

  const ceilingMs = Math.max(60_000, Number(process.env['P318_STANDIN_CEILING_MS'] ?? '') || 45 * 60_000);
  const runnerPid = process.ppid;
  const pid = process.pid;
  const logFile = join(DIR, `reads-${String(pid)}.jsonl`);
  const cmdFile = join(DIR, `cmd-${String(pid)}.json`);
  const stateFile = join(DIR, `state-${String(pid)}.json`);
  const cwd = process.cwd();
  const dirName = basename(cwd);
  const home = process.env['HOME'] ?? '';
  const paneId = process.env['TMUX_PANE'] ?? '';
  const sessionUuid = `p318-${String(pid)}-${String(Date.now())}`;
  const timers = new Set();
  let done = null;
  let exitCode = 0;
  const finished = new Promise((r) => {
    done = (code = 0) => {
      exitCode = code;
      r();
    };
  });

  // The hook URLs, from the --settings file its own argv names (Claude only).
  const hookUrls = {};
  if (agent === 'claude') {
    const at = args.indexOf('--settings');
    const path = at === -1 ? null : args[at + 1];
    try {
      const settings = JSON.parse(readFileSync(String(path), 'utf8'));
      for (const event of ['PermissionRequest', 'PostToolUse', 'UserPromptSubmit', 'Stop', 'SessionEnd']) {
        const url = settings?.hooks?.[event]?.[0]?.hooks?.[0]?.url;
        if (typeof url === 'string' && url.startsWith('http://127.0.0.1:')) hookUrls[event] = url;
      }
    } catch {
      /* no settings file: no hook is posted, which the probe reads as no hook */
    }
  }

  let mode = 'idle';
  let serial = 0;
  let screenName = 'nothing';
  let rows = [];
  let cursor = null;
  let focused = true;
  let drawnAt = 0n;
  let markers = [];
  let denyMarkers = [];
  let onCommit = { op: 'idle' };
  let afterSubmit = { op: 'work', ms: 400 };
  let typed = '';
  let pasting = false;
  let queued = [];
  let seq = 0;
  let titleTimer = null;
  let workTimer = null;
  let committed = false;
  let pressCommand = '';
  let dropNs = 0n;
  let hooksPosted = 0;
  let submits = 0;
  /** What was submitted so far, line by line, echoed above the prompt as the agents' transcripts do (R16). */
  let transcript = [];
  /** A hand-off is no session end: the agent's hook and registry stay as they were (R12). */
  let handingOff = false;

  const later = (ms, fn) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
    return t;
  };
  const now = () => process.hrtime.bigint();
  const log = (entry) => {
    try {
      appendFileSync(logFile, `${JSON.stringify({ ...entry, t: String(entry.t ?? now()), serial, screen: screenName, mode })}\n`);
    } catch {
      /* the directory went away; the poll ends the stand-in */
    }
  };

  function writeState() {
    try {
      writeFileSync(
        stateFile,
        JSON.stringify({
          agent,
          pid,
          runnerPid,
          seq,
          mode,
          serial,
          screen: screenName,
          cols: process.stdout.columns ?? null,
          rows: process.stdout.rows ?? null,
          markers,
          committed,
          typedBytes: Buffer.byteLength(typed, 'utf8'),
          queued: queued.length,
          submits,
          hooksPosted,
          focused,
          at: Date.now()
        })
      );
    } catch {
      /* the directory went away */
    }
  }

  /** Claude Code's own registry file, the way it writes it (claude-registry.ts reads it). */
  function registry(status, waitingFor) {
    if (agent !== 'claude' || home === '') return;
    try {
      const dir = join(home, '.claude', 'sessions');
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, `${String(pid)}.json`),
        JSON.stringify({
          pid,
          kind: 'interactive',
          status,
          ...(waitingFor === undefined ? {} : { waitingFor }),
          tmux: paneId === '' ? null : `p318:@0.${paneId}`,
          statusUpdatedAt: Date.now(),
          version: '2.1.287',
          sessionId: sessionUuid,
          cwd
        })
      );
    } catch {
      /* a scratch HOME the probe removed */
    }
  }

  /** POST one hook the way Claude Code does: JSON, to 127.0.0.1 alone, never awaited by the screen. */
  function hook(event, body) {
    const url = hookUrls[event];
    if (url === undefined) return;
    hooksPosted += 1;
    log({ kind: 'hook', event });
    try {
      const u = new URL(url);
      if (u.hostname !== '127.0.0.1') return;
      const data = Buffer.from(JSON.stringify(body), 'utf8');
      const req = httpRequest({ host: '127.0.0.1', port: Number(u.port), path: `${u.pathname}${u.search}`, method: 'POST', headers: { host: u.host, 'content-type': 'application/json', 'content-length': String(data.length) } }, (res) => res.resume());
      req.on('error', () => undefined);
      req.end(data);
    } catch {
      /* a refused hook is a hook Tortie did not take, which the probe reads */
    }
  }
  const hookBase = () => ({ session_id: sessionUuid, transcript_path: join(home, '.claude', 'projects', 'p318', `${sessionUuid}.jsonl`), cwd, permission_mode: 'default' });

  function title(text) {
    process.stdout.write(`${ESC}]2;${text}\u0007`);
  }
  function setTitleLoop(kind) {
    if (titleTimer !== null) clearInterval(titleTimer);
    titleTimer = null;
    if (agent !== 'codex') return;
    if (kind === 'idle') {
      title(dirName);
      return;
    }
    let i = 0;
    const tick = () => {
      if (kind === 'press') title(`[ ${i % 2 === 0 ? '!' : '.'} ] Action Required | ${dirName}`);
      else title(`${BRAILLE[i % BRAILLE.length]} ${dirName}`);
      i += 1;
    };
    tick();
    titleTimer = setInterval(tick, kind === 'press' ? 500 : 100);
  }

  /** The current screen in ONE write: home, clear, every row cut to the width, the bottom kept. */
  function paint() {
    const cols = process.stdout.columns ?? 80;
    const height = process.stdout.rows ?? 24;
    const shown = rows.length > height ? rows.slice(rows.length - height) : rows;
    const offset = rows.length - shown.length;
    let tail = `${ESC}[?25l`;
    if (cursor !== null && agent === 'codex') {
      const y = cursor.y - offset;
      if (y >= 0 && y < height) tail = `${ESC}[${String(y + 1)};${String(Math.min(cols, cursor.x + 1))}H${ESC}[?25h`;
    }
    process.stdout.write(`${ESC}[0m${ESC}[H${ESC}[2J${shown.map((r) => clipRow(r, cols)).join('\r\n')}${ESC}[0m${tail}`);
  }
  function draw(name, nextRows, nextCursor = null) {
    serial += 1;
    screenName = name;
    rows = nextRows;
    cursor = nextCursor;
    drawnAt = now();
    paint();
    log({ kind: 'drew', t: drawnAt });
    writeState();
  }

  function stopWork() {
    if (workTimer !== null) clearInterval(workTimer);
    workTimer = null;
  }

  /**
   * The idle screen with what was submitted echoed above the prompt, RAW, one
   * row a line: a dialog-shaped message draws a dialog-shaped screen, which is
   * the worst case for the Mac's screen verdict and the case R16 drives (the
   * agents' own readers must speak before the screen; research 135 §5).
   */
  function idleBase() {
    const base = idleScreen(agent, { focused });
    if (transcript.length === 0) return base;
    const at = promptRowOf(agent, base);
    if (at === -1) return base;
    const insertAt = agent === 'claude' ? Math.max(0, at - 1) : at;
    return [...base.slice(0, insertAt), ...transcript.slice(-12), '', ...base.slice(insertAt)];
  }

  function showIdle() {
    stopWork();
    mode = 'idle';
    markers = [];
    denyMarkers = [];
    committed = false;
    typed = '';
    const base = idleBase();
    const at = promptRowOf(agent, base);
    draw('idle', base, agent === 'codex' && at !== -1 ? { x: 2, y: at } : null);
    registry('idle');
    setTitleLoop('idle');
  }
  function redrawTyped() {
    const base = idleBase();
    if (typed === '') {
      const at = promptRowOf(agent, base);
      rows = base;
      cursor = agent === 'codex' && at !== -1 ? { x: 2, y: at } : null;
    } else {
      const composed = withPrompt(agent, base, typed, { focused });
      rows = composed.rows;
      cursor = composed.cursor;
    }
    paint();
    writeState();
  }

  function showPress(op) {
    stopWork();
    const command = String(op.command ?? 'touch p318.txt');
    pressCommand = command;
    onCommit = op.onCommit ?? { op: 'idle' };
    const dropMs = Number.isFinite(Number(op.dropMs)) && Number(op.dropMs) >= 0 ? Number(op.dropMs) : agent === 'claude' ? CLAUDE_DROP_MS : 0;
    dropNs = BigInt(Math.round(dropMs)) * 1_000_000n;
    committed = false;
    const drawIt = () => {
      mode = 'press';
      const screenRows = agent === 'claude' ? claudeBashScreen(command, cwd) : codexApprovalScreen(command, { twoOptions: op.twoOptions === true });
      markers = [];
      denyMarkers = [];
      for (const r of screenRows) {
        const m = /^\s*(?:❯|›)?\s*([1-9])\.\s+(\S.*)$/.exec(r);
        if (m !== null) {
          markers.push(m[1]);
          if (/^No\b/.test(m[2])) denyMarkers.push(m[1]);
        }
      }
      draw(`press:${agent === 'claude' ? 'claude-bash' : 'codex-approval'}`, screenRows);
      registry('waiting', 'permission prompt');
      setTitleLoop('press');
    };
    if (agent === 'claude' && op.noHook !== true) {
      const template = realHookBodies()[0] ?? {};
      hook('PermissionRequest', {
        ...hookBase(),
        hook_event_name: 'PermissionRequest',
        tool_name: 'Bash',
        tool_input: { command, description: 'Run the command the stand-in names' },
        permission_suggestions: template.permission_suggestions ?? []
      });
      later(HOOK_LEAD_MS, drawIt);
    } else {
      drawIt();
    }
  }

  function showWork(op) {
    stopWork();
    mode = 'work';
    markers = [];
    const base = idleBase();
    const at = promptRowOf(agent, base);
    const spin = (i) => {
      const r = [...base];
      if (at > 0) r.splice(Math.max(0, at - 1), 0, `${BRAILLE[i % BRAILLE.length]} Working… (p318 stand-in)`);
      return r;
    };
    let i = 0;
    draw('working', spin(0));
    registry('busy');
    setTitleLoop('work');
    const until = Date.now() + Math.max(0, Number(op.ms) || 0);
    workTimer = setInterval(() => {
      i += 1;
      if (Date.now() >= until) {
        stopWork();
        if (agent === 'claude') hook('Stop', { ...hookBase(), hook_event_name: 'Stop', stop_hook_active: false });
        // A message queued while it worked is submitted at the turn's end.
        if (queued.length > 0) {
          const next = queued.shift();
          submit(next, true);
          return;
        }
        apply(op.then ?? { op: 'idle' });
        return;
      }
      rows = spin(i);
      paint();
    }, 150);
  }

  function submit(text, fromQueue) {
    submits += 1;
    log({ kind: 'submitted', hex: Buffer.from(text, 'utf8').toString('hex'), bytes: Buffer.byteLength(text, 'utf8'), queued: fromQueue === true });
    if (agent === 'claude') hook('UserPromptSubmit', { ...hookBase(), hook_event_name: 'UserPromptSubmit', prompt: text });
    transcript.push(...text.split('\n'));
    typed = '';
    apply(afterSubmit);
  }

  function commit(marker, t) {
    committed = true;
    log({ kind: 'commit', marker, t, sinceDrawMs: Number((t - drawnAt) / 1_000_000n), command: pressCommand, deny: denyMarkers.includes(marker) });
    if (agent === 'claude' && !denyMarkers.includes(marker)) {
      hook('PostToolUse', { ...hookBase(), hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: pressCommand }, tool_response: { stdout: '', stderr: '', interrupted: false } });
    }
    const next = onCommit;
    later(AFTER_COMMIT_MS, () => apply(next));
  }

  function apply(op) {
    if (op?.op === 'idle') {
      if (op.focused !== undefined) focused = op.focused === true;
      showIdle();
    } else if (op?.op === 'press') {
      showPress(op);
    } else if (op?.op === 'screen') {
      stopWork();
      mode = 'screen';
      const r = loadReplyFixture(String(op.fixture)) ?? loadActivityFixture(String(op.fixture));
      if (r !== null) draw(`screen:${String(op.fixture)}`, trimmed(r));
      markers = [];
      // `waiting`: the agent's own reader says it waits, as Claude Code's
      // registry and Codex's title do at a question of their own (R7's gate).
      if (op.waiting === true) {
        registry('waiting', 'permission prompt');
        setTitleLoop('press');
      }
    } else if (op?.op === 'work') {
      showWork(op);
    } else if (op?.op === 'afterSubmit') {
      afterSubmit = op.then ?? afterSubmit;
    } else if (op?.op === 'clear') {
      transcript = [];
      if (mode === 'idle') redrawTyped();
    } else if (op?.op === 'handoff') {
      // R12: as Claude, the PermissionRequest of `hookFirst` is posted first, so
      // the session's question id carries a Bash ask while a NON-AGENT program
      // draws the numbered dialog; the hand-off waits for the POST to leave.
      const leave = () => {
        try {
          const path = resolveScreenPath(String(op.fixture));
          if (path !== null) {
            handingOff = true;
            registry('waiting', 'permission prompt');
            writeFileSync(join(DIR, `handoff-${String(runnerPid)}.txt`), path);
            log({ kind: 'handoff', fixture: String(op.fixture) });
            done(HANDOFF_EXIT);
          }
        } catch {
          /* nothing to hand to */
        }
      };
      if (agent === 'claude' && typeof op.hookFirst === 'string') {
        hook('PermissionRequest', { ...hookBase(), hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command: op.hookFirst, description: 'Run the command the stand-in names' } });
        later(250, leave);
      } else {
        leave();
      }
    } else if (op?.op === 'exit') {
      done(0);
    }
  }

  /**
   * What is read. EVERY CHUNK is written down first, raw, with its stamp. Then
   * it is acted on: a bracketed paste goes into the prompt, a carriage return
   * outside a paste submits at the prompt (never at a press screen, where it
   * is written down as `enter` and does nothing), a digit at a press screen
   * commits when it is a marker and Claude's drop window has passed, printable
   * text at the prompt is a draft, and a focus report moves Claude's caret.
   */
  function onData(chunk) {
    const t = now();
    log({ kind: 'read', t, hex: chunk.toString('hex') });
    let s = chunk.toString('latin1');
    while (s.length > 0) {
      if (s.startsWith(`${ESC}[200~`)) {
        pasting = true;
        s = s.slice(6);
        continue;
      }
      if (s.startsWith(`${ESC}[201~`)) {
        pasting = false;
        s = s.slice(6);
        if (mode === 'idle' || mode === 'work') redrawTyped();
        continue;
      }
      if (s.startsWith(`${ESC}[I`) || s.startsWith(`${ESC}[O`)) {
        const inFocus = s[2] === 'I';
        s = s.slice(3);
        log({ kind: 'focus', t, focused: inFocus });
        if (agent === 'claude') {
          focused = inFocus;
          if (mode === 'idle') redrawTyped();
        }
        continue;
      }
      const esc = /^\u001b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\u0007]*\u0007|.)/.exec(s);
      if (esc !== null) {
        // A device-attributes or colour answer, an arrow, Esc: written down above, acted on never.
        s = s.slice(esc[0].length);
        continue;
      }
      // One UTF-8 character from the latin1 view: gather its continuation bytes.
      const first = s.charCodeAt(0);
      let n = 1;
      if (first >= 0xf0) n = 4;
      else if (first >= 0xe0) n = 3;
      else if (first >= 0xc0) n = 2;
      const ch = Buffer.from(s.slice(0, n), 'latin1').toString('utf8');
      s = s.slice(n);
      if (pasting) {
        if (mode === 'idle' || mode === 'work') typed += ch === '\r' ? '\n' : ch;
        continue;
      }
      if (mode === 'press') {
        if (ch === '\r' || ch === '\n') {
          log({ kind: 'enter', t });
          continue;
        }
        if (/^[0-9]$/.test(ch)) {
          if (committed) {
            log({ kind: 'late-digit', t, marker: ch });
            continue;
          }
          if (t - drawnAt < dropNs) {
            log({ kind: 'dropped', t, marker: ch, sinceDrawMs: Number((t - drawnAt) / 1_000_000n) });
            continue;
          }
          if (markers.includes(ch)) commit(ch, t);
          else log({ kind: 'not-a-marker', t, marker: ch });
        }
        continue;
      }
      if (mode === 'idle' || mode === 'work') {
        if (ch === '\r') {
          const text = typed;
          if (mode === 'work') {
            queued.push(text);
            typed = '';
            log({ kind: 'queued', hex: Buffer.from(text, 'utf8').toString('hex'), bytes: Buffer.byteLength(text, 'utf8') });
            redrawTyped();
          } else {
            submit(text, false);
          }
          continue;
        }
        if (ch === '\u007f' || ch === '\b') typed = [...typed].slice(0, -1).join('');
        else if (ch === '\u0015') typed = '';
        else if (ch >= ' ' || ch === '\n') typed += ch;
        redrawTyped();
      }
    }
    writeState();
  }

  try {
    writeFileSync(join(DIR, `hello-${String(pid)}.json`), JSON.stringify({ pid, runnerPid, agent, session: process.env['GMUX_SESSION_ID'] ?? null, pane: paneId, cwd, cols: process.stdout.columns ?? null, rows: process.stdout.rows ?? null, hooks: Object.keys(hookUrls), at: Date.now() }));
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.on('data', onData);
    }
    // Bracketed paste, as both agents ask (research 135 §3.3); focus reports as Claude Code asks.
    process.stdout.write(`${ESC}[?2004h${agent === 'claude' ? `${ESC}[?1004h` : ''}`);
    process.stdout.on('resize', () => {
      paint();
      log({ kind: 'resize', cols: process.stdout.columns ?? null, rows: process.stdout.rows ?? null });
      writeState();
    });
    for (const sig of ['SIGHUP', 'SIGTERM', 'SIGINT']) process.on(sig, () => done(0));
    later(ceilingMs, () => done(0));
    showIdle();
    const poll = setInterval(() => {
      if (!existsSync(DIR)) {
        done(0);
        return;
      }
      let cmd;
      try {
        cmd = JSON.parse(readFileSync(cmdFile, 'utf8'));
      } catch {
        return;
      }
      if (typeof cmd?.seq !== 'number' || cmd.seq <= seq) return;
      seq = cmd.seq;
      for (const op of Array.isArray(cmd.ops) ? cmd.ops : []) apply(op);
      writeState();
    }, 25);
    timers.add(poll);
    await finished;
  } finally {
    stopWork();
    if (titleTimer !== null) clearInterval(titleTimer);
    for (const t of timers) {
      clearTimeout(t);
      clearInterval(t);
    }
    if (agent === 'claude' && !handingOff) {
      hook('SessionEnd', { ...hookBase(), hook_event_name: 'SessionEnd', reason: 'exit' });
      try {
        rmSync(join(home, '.claude', 'sessions', `${String(pid)}.json`), { force: true });
      } catch {
        /* Claude Code deletes its file on exit too */
      }
    }
    try {
      process.stdout.write(`${ESC}[?2004l${agent === 'claude' ? `${ESC}[?1004l` : ''}`);
    } catch {
      /* the terminal is gone */
    }
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
      } catch {
        /* the terminal is gone */
      }
    }
    process.stdin.pause();
  }
  return exitCode;
}

/** A committed screen's path for the hand-off: a reply fixture, or a committed activity fixture. */
function resolveScreenPath(name) {
  if (!/^[a-z0-9][a-z0-9.-]*\.txt$/.test(name)) return null;
  for (const dir of [REPLY_FIXTURES, join(ROOT, 'src', 'main', 'activity', '__tests__', 'fixtures')]) {
    const p = join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}
/** A committed activity fixture (a trust gate, the theme picker), its rows as committed. */
function loadActivityFixture(name) {
  if (!/^[a-z0-9][a-z0-9.-]*\.txt$/.test(name)) return null;
  const p = join(ROOT, 'src', 'main', 'activity', '__tests__', 'fixtures', name);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8').split('\n');
}

/** This file run as the entry point, however the path that named it was spelled. */
function isEntry() {
  try {
    return process.argv[1] !== undefined && pathToFileURL(realpathSync(process.argv[1])).href === pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href;
  } catch {
    return false;
  }
}
if (isEntry()) {
  standIn()
    .then((code) => process.exit(code))
    .catch(() => process.exit(0));
}
