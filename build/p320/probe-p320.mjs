#!/usr/bin/env node
/**
 * probe-p320.mjs. THE PHASE 320 APP RUN, SLICE 1: the wheel reaches a program on
 * another machine that asked for it.
 *
 * GitHub issue 31 (Jake Levirne): "Expect it to scroll just like a local session
 * does. Instead, nothing scrolls." Research 130 found why. For a session on
 * another machine main answers every scroll call with NO_PANE_HERE, the surface
 * latches `noPane`, and `handleWheel` returned false for every wheel event after
 * that, which cancels xterm on both of its wheel paths. The reporter's far
 * Claude draws on the alternate screen and asks for the mouse, so its lines are
 * in its own memory and the wheel is the only way to reach them.
 *
 * ONE Electron through build/electron-run.mjs's `withElectron`, on a scratch
 * profile, a scratch HOME and the tmux socket build/harness-socket.mjs hands
 * it, over one local scratch project and the LOOPBACK scratch machine that
 * build/with-scratch-machine.mjs starts around this file (its own sshd on
 * 127.0.0.1, its own keys and agent, its own TMUX_TMPDIR). That is the shape
 * `probe:p95` uses. REAL wheel events and REAL keys go in over the DevTools
 * protocol, and the rulers are the programs themselves.
 *
 * ## The two stand-ins, and why the program is the ruler
 *
 * Both are in this directory and both are started by typing one line into a
 * session's shell, so neither is a child of this file.
 *
 *   build/p320/fullscreen.mjs  Claude Code's fullscreen renderer as research
 *                              130 §2.2 read it: the alternate screen, Claude's
 *                              own clear (`CSI 2J CSI 3J CSI H`, so tmux holds
 *                              one screen), 5,000 lines in its own memory, the
 *                              mouse asked for as `any` (1000/1002/1003/1006)
 *                              or not at all. It LOGS every chunk it reads and
 *                              the top line it draws.
 *   build/p320/recorder.mjs    A raw-mode program on the normal screen that
 *                              logs every byte typed into it.
 *
 * On the loopback machine the far side IS this Mac, so the far program writes
 * its log under this run's own directory and the probe reads it from here.
 * Nothing reads the far tmux server; the one call aimed at it is the teardown.
 *
 * ## The arms (P320_ARMS, a comma separated subset; all by default)
 *
 *   R1  THE REPORTER'S CASE. 20 wheel notches toward older lines over a
 *       REMOTE fullscreen stand-in that asked for the mouse. Graded: xterm's
 *       own `term.modes.mouseTrackingMode` reads `any`; every notch reached
 *       the far program as a wheel report; its view moved toward older lines;
 *       and it received no byte that was not a mouse report. Red at the
 *       parent: 0 reports and the view does not move.
 *   R2  PHASE 95 KEPT. 20 notches over a REMOTE plain shell, then 20 over the
 *       recorder in that same session. The shell is a `/bin/sh` with a fixed
 *       prompt and one line in its history, so a wheel handed over as the
 *       arrow keys xterm's alternate-scroll branch sends would bring that line
 *       back onto the prompt. Graded on both builds: the prompt row is
 *       unchanged, the recorder received 0 bytes, xterm's mode reads `none`,
 *       and no scroll error line was printed. `probe:p95`'s step 6 is the
 *       other half and is its own run.
 *   R3  THE STATED GAP. 20 notches over a REMOTE alternate-screen program that
 *       did NOT ask for the mouse (the stand-in with `--mouse none`, which is
 *       `less` or a `vim` with no mouse). Graded on both builds: it received 0
 *       bytes and its view did not move. THE 0 BYTES ARE THE RULER: the
 *       stand-in writes its state line only when a byte reaches it, so with
 *       none its top line after the notches reads null and the view check has
 *       nothing to compare. It is research 130 §3.3's gap and the
 *       report names it: on this Mac such a program scrolls through xterm's
 *       alternate-scroll keys, on another machine under slice 1 it does not,
 *       and slice 2 (Phase 320.1) is what closes it.
 *   R5  THE PANEL. Read Last Lines opened on R1's fullscreen pane by a real
 *       click on the band's button, at its default depth. Graded: the count
 *       line is drawn and "That is everything this session has kept." is not,
 *       because the program keeps its lines in its own memory; and the button
 *       carries no remote-only tooltip. Red at the parent on both.
 *   R6  THE CONTROL ON THIS MAC, which the entry does not name and the
 *       operator's no-regression rule asks for. 20 notches over a LOCAL
 *       fullscreen stand-in that asked for the mouse, graded exactly as R1:
 *       every notch reaches the program as a wheel report and its view moves
 *       toward older lines. It is how a fullscreen Claude scrolls on this Mac
 *       today, green at the parent, and it is here because this phase edits
 *       `handleWheel`, which every wheel over a pane on this Mac passes, so
 *       the local fullscreen wheel is read beside the parent's.
 *
 *   There is no R4. It graded the build round's two typing fixes, P2 and P3,
 *   with "fix the bug" typed through a trackpad flick on this Mac. Both were
 *   removed under the operator's no-regression rule, because each made a
 *   typing scenario worse than the parent, and the arm went with them
 *   (build/p320/SPEC.md, "§As built — removed under his no-regression rule").
 *   Typing through a flick is Phase 320.1's, where the reverifier's M3 shape is
 *   the ruler. The name is not reused, so a reading from an earlier run never
 *   passes for a later one.
 *
 * WHAT THIS RUN CANNOT SAY. The remote arms run over loopback, so the
 * connection adds no latency worth the name; the typing arms over a real link
 * are Phase 320.1's node rig, not this. A real Claude Code in fullscreen,
 * scrolled by a real trackpad, is the one proof that cannot be a stand-in and
 * is the integrator's, once.
 *
 * ## Another checkout, which is how the parent is measured
 *
 * `P320_CHECKOUT=<a BUILT worktree>` points THIS run at that checkout's `out/`
 * with this file's stand-ins and graders, one Electron, never beside another
 * run: two builds are two invocations. The exit code is the same rule
 * everywhere: 0 with no finding, 1 with findings, 2 on a refusal. At the parent
 * R1 and R5 are expected to FAIL and R2, R3 and R6 to pass.
 *
 * ## What it refuses
 *
 *   - No `GMUX_TMUX_SOCKET`, the sockets `gmux` and `default` by name, and any
 *     socket that is not a `gmux-p320` harness socket.
 *   - No `GMUX_HARNESS_DIR`.
 *   - A remote arm chosen with no carriage file from build/with-scratch-machine.mjs.
 *   - `out/main/index.js` missing in the checkout it is pointed at, or a STALE
 *     `out/`: any source the readings depend on newer than the bundle built
 *     from it. The script carries no `npm run build &&` on purpose, because a
 *     run against another checkout must not rebuild this one.
 *   - A `GMUX_TMUX_BIN` or a `P320_FAR_TMUX` that is not an executable file.
 *
 * ## Environment
 *
 *   GMUX_TMUX_SOCKET  The scratch socket. build/harness-socket.mjs sets it.
 *   GMUX_HARNESS_DIR  The scratch directory. Set by the same wrapper.
 *   GMUX_CONFIG_ROOT  Where build/with-scratch-machine.mjs wrote the carriage
 *                     file. The package script sets it to the harness dir.
 *   GMUX_TMUX_BIN     Optional, passed through to the app for THIS Mac's tmux.
 *   P320_FAR_TMUX     Optional, the tmux the loopback machine runs. By default
 *                     the carriage's own, being `which tmux` (3.6a here); the
 *                     vendored build/vendor/tmux/bin/tmux is 3.7b.
 *   P320_CHECKOUT     A BUILT worktree to measure instead of this one.
 *   P320_ARMS         A comma separated subset of R1,R2,R3,R5,R6.
 *   P320_OUT_DIR      Where readings, two photographs and the app's own output
 *                     go. Default `out/p320`. `out/` is gitignored and
 *                     electron-builder packs `out/**`, so remove the directory
 *                     before a package.
 *
 * ## Usage, from the worktree root. BUILD FIRST.
 *
 *   npm run build && npm run probe:p320                    HEAD, every arm
 *   P320_FAR_TMUX=$PWD/build/vendor/tmux/bin/tmux npm run -s probe:p320
 *                                                          the far side on 3.7b
 *   P320_CHECKOUT=/path/to/parent npm run -s probe:p320    the parent, built
 *   node build/p320/probe-p320.mjs --self-test             the graders alone,
 *                                                          launches nothing
 *
 * ## SAFETY
 *
 * The one Electron is started through `withElectron`, which ends the tree it
 * started and the local scratch tmux server it was handed in a `finally`
 * whatever happened. The loopback machine's sshd, agent and tmux server belong
 * to build/with-scratch-machine.mjs, which ends them by recorded pid when this
 * file exits; this file's own `finally`, and its `exit` handler for a run an
 * interrupt ends, end the far tmux server once more, by
 * the pid that server reports through the far binary this run used, because a
 * `P320_FAR_TMUX` other than the carriage's would not answer the wrapper's own
 * reading. The stand-ins are typed into panes, so they end with those servers,
 * and each also ends itself after 15 minutes. Every process this file starts
 * itself is a synchronous tmux read or the one ssh-keyscan build/ssh-run.mjs
 * runs, each of which has exited before the call returns. It spawns no agent, spends no token, never names `-L gmux` or the
 * default server, and never uses pkill or kill-server.
 *
 * ONE LINE PER REMOTE SESSION IS TYPED INTO THE LOOPBACK MACHINE'S LOGIN SHELL,
 * which on the loopback machine is this Mac's own login shell with this Mac's
 * own home, the way `probe:p95`'s step 6 already types into it. Each line
 * begins with a space and `exec`s away from that shell at once, so a shell
 * that ignores space-led lines records nothing and none records more than that
 * one line.
 */
import { spawnSync } from 'node:child_process';
import {
  accessSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { keyscanText } from '../ssh-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HERE = dirname(fileURLToPath(import.meta.url));
const TAG = '[p320]';
const CALLER = 'build/p320/probe-p320.mjs';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = (v) => JSON.stringify(v);

// ---------------------------------------------------------------------------
// The numbers this run holds the app against, BY VALUE.
// ---------------------------------------------------------------------------
/** Wheel notches per remote arm, the entry's 20. */
export const NOTCHES = 20;
/** Lines of travel in one notch, which is what a mouse notch is on this Mac. */
const NOTCH_LINES = 3;
/**
 * One notch in CSS pixels: three lines, and NEVER under 60 px. xterm 6.0.0
 * reads a pixel delta under 50 as a trackpad and scales it by 0.3 before it
 * counts lines (`CoreMouseService.consumeWheelEvent`), so a small notch would
 * send a report only some of the time and R1's "every notch arrives" would
 * read a ruler's rounding as a defect. At 60 px and over, one event is at least
 * one line and xterm sends exactly one report for it.
 */
export function notchPx(cell) {
  return Math.max(60, Math.round(cell * NOTCH_LINES));
}
/** Between two notches. More than the 16 ms coalescing window, less than a person's pause. */
const NOTCH_GAP_MS = 60;
/**
 * The two sentences slice 1 deletes, by value, so a build that kept either is
 * named. Neither is imported: a probe that read them from the source it judges
 * would agree with a wrong one.
 */
export const FALSE_SENTENCE = 'That is everything this session has kept.';
export const REMOTE_ONLY_TOOLTIP = 'cannot scroll back';

export const ALL_ARMS = ['R1', 'R2', 'R3', 'R5', 'R6'];
const REMOTE_ARMS = ['R1', 'R2', 'R3', 'R5'];

// ---------------------------------------------------------------------------
// The graders. Pure, exported, and proved both ways under --self-test.
// ---------------------------------------------------------------------------

/** Bytes a person can read: printable ASCII as is, everything else escaped. */
export function shown(text) {
  return JSON.stringify(String(text)).slice(1, -1);
}

/**
 * What a stand-in's log says happened AFTER `offset` records: the wheel reports
 * it read, the bytes that were not a report, and the last top line it drew.
 */
export function tally(records, offset = 0) {
  const out = { up: 0, down: 0, reports: 0, other: '', bytes: '', top: null };
  for (const r of records.slice(offset)) {
    if (r.kind === 'input') {
      out.bytes += Buffer.from(r.hex ?? '', 'hex').toString('latin1');
      for (const one of r.reports ?? []) {
        out.reports += 1;
        const base = one.b & ~(4 | 8 | 16 | 32);
        if (base === 64) out.up += 1;
        else if (base === 65) out.down += 1;
      }
      if (typeof r.other === 'string' && r.other !== '') out.other += Buffer.from(r.other, 'hex').toString('latin1');
    }
    if ((r.kind === 'state' || r.kind === 'ready') && typeof r.top === 'number') out.top = r.top;
  }
  return out;
}

/** The top line a stand-in last drew at or before `offset` records. */
export function topAt(records, offset) {
  let top = null;
  for (const r of records.slice(0, offset)) {
    if ((r.kind === 'state' || r.kind === 'ready') && typeof r.top === 'number') top = r.top;
  }
  return top;
}

/**
 * R1, and R6 as its control on this Mac. `r` is { mode, notches, topBefore,
 * after: tally }. R1's sentences say "on another machine" and "the far
 * program"; R6's say "on this Mac" and "the program".
 */
export function wheelFindings(r, arm = 'R1') {
  const out = [];
  const far = arm === 'R1';
  const where = far ? 'on another machine' : 'on this Mac';
  const prog = far ? 'the far program' : 'the program';
  const after = r.after ?? { up: 0, down: 0, other: '', top: null };
  if (r.mode !== 'any') {
    out.push(`${arm} xterm's mouse mode over the full-screen program ${where} reads ${J(r.mode)}, not "any", so the program's request for the mouse never reached xterm`);
  }
  if (after.up === 0) {
    out.push(
      `${arm} ${String(r.notches)} wheel notches over a full-screen program ${where} reached it as 0 wheel reports and its view did not move ` +
        `(top line ${String(r.topBefore)} -> ${String(after.top)})${far ? ': nothing scrolls, which is issue 31' : ''}`
    );
    return out;
  }
  if (after.up < r.notches) {
    out.push(`${arm} ${String(r.notches)} wheel notches reached ${prog} as ${String(after.up)} wheel reports, so ${String(r.notches - after.up)} were eaten on the way`);
  }
  if (!(typeof after.top === 'number' && typeof r.topBefore === 'number' && after.top < r.topBefore)) {
    out.push(`${arm} ${prog} read ${String(after.up)} wheel reports and its view did not move toward older lines (top line ${String(r.topBefore)} -> ${String(after.top)})`);
  }
  if (after.down > 0) out.push(`${arm} the wheel turned only toward older lines and ${prog} read ${String(after.down)} wheel-down reports`);
  if (after.other.length > 0) {
    out.push(`${arm} ${prog} received ${String(after.other.length)} bytes that are not mouse reports ("${shown(after.other)}"), which is the wheel typed as keys`);
  }
  return out;
}

/** R2 and R3. A program that did not ask for the mouse receives nothing from the wheel. */
export function swallowFindings(arm, r) {
  const out = [];
  const bytes = r.after?.bytes ?? '';
  if (bytes.length > 0) {
    out.push(`${arm} ${String(r.notches)} wheel notches over ${r.what} reached it as ${String(bytes.length)} bytes ("${shown(bytes)}"); a program that did not ask for the mouse must receive nothing, because claude and codex read the arrow keys as history`);
  }
  if (r.mode !== undefined && r.mode !== 'none') {
    out.push(`${arm} xterm's mouse mode over ${r.what} reads ${J(r.mode)}, not "none", so this arm did not test a program that asked for nothing`);
  }
  if (r.checkTop === true && typeof r.topBefore === 'number' && typeof r.after?.top === 'number' && r.after.top !== r.topBefore) {
    out.push(`${arm} the view of ${r.what} moved (top line ${String(r.topBefore)} -> ${String(r.after.top)})`);
  }
  if (typeof r.errors === 'number' && r.errors > 0) out.push(`${arm} the wheel printed ${String(r.errors)} scroll error line(s) in the app's log`);
  return out;
}

/** R2's shell. The prompt row before and after the notches. */
export function promptFindings(before, after, prompt) {
  if (typeof before !== 'string' || before.trim() !== prompt) {
    return [`R2 the plain shell's line read ${J(before)} before the wheel and not the bare prompt ${J(prompt)}, so there was nothing to hold`];
  }
  if (after !== before) {
    return [`R2 ${String(NOTCHES)} wheel notches over a plain shell on another machine changed its line from ${J(before)} to ${J(after)}: the wheel was typed as keys`];
  }
  return [];
}

/** R5. `p` is { opened, text, allThereEl, counts, title }. */
export function panelFindings(p) {
  if (!p || p.opened !== true) return ['R5 the Read Last Lines panel did not open, so nothing it says was read'];
  const out = [];
  if ((p.text ?? '').includes(FALSE_SENTENCE) || p.allThereEl === true) {
    out.push(`R5 Read Last Lines says "${FALSE_SENTENCE}" over a program that keeps its lines in its own memory, which is not true`);
  }
  if (typeof p.counts !== 'string' || p.counts.trim() === '') out.push('R5 the count line, which says what came back, is not drawn');
  if (typeof p.title === 'string' && p.title.includes(REMOTE_ONLY_TOOLTIP)) {
    out.push(`R5 the band's Read last lines button still carries a tooltip only a session on another machine gets (${J(p.title)})`);
  }
  return out;
}

/** The P320_ARMS subset, or every arm; an unknown name is a refusal. */
export function chooseArms(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { arms: [...ALL_ARMS], bad: [] };
  const names = text.split(',').map((s) => s.trim().toUpperCase()).filter((s) => s !== '');
  const bad = names.filter((n) => !ALL_ARMS.includes(n));
  return { arms: ALL_ARMS.filter((a) => names.includes(a)), bad };
}

/**
 * The staleness grader, p292's by value. `sources` is `[path, mtimeMs]` per
 * source and `bundle` is `[path, mtimeMs]` of the bundle built from them, or
 * null. Answers the refusal sentence, or null.
 */
export function staleSentence(sources, bundle) {
  if (bundle === null) return 'out/ holds no bundle for the sources this run reads; build first.';
  const newer = sources
    .filter(([, mtime]) => mtime > bundle[1])
    .map(([path, mtime]) => `${path} is ${((mtime - bundle[1]) / 1000).toFixed(1)} s newer than ${bundle[0]}`);
  if (newer.length === 0) return null;
  return `out/ is older than the sources this run reads; build first (${newer.join('; ')}).`;
}

// ---------------------------------------------------------------------------
// --self-test. Every grader on a HEAD shaped reading and on a parent shaped one.
// ---------------------------------------------------------------------------
function selfTest() {
  const input = (hex, reports = [], other = '') => ({ kind: 'input', hex, reports, other });
  const up = { b: 64, x: 20, y: 10, release: false };
  const sgrUp = Buffer.from('\x1b[<64;20;10M', 'latin1').toString('hex');
  const headLog = [{ kind: 'ready', top: 4971 }, ...Array.from({ length: 20 }, (_, k) => [input(sgrUp, [up]), { kind: 'state', top: 4971 - 3 * (k + 1) }]).flat()];
  const fixtures = [
    ['tally reads reports, other bytes and the last top', () => tally(headLog, 1), { up: 20, down: 0, reports: 20, other: '', bytes: '\x1b[<64;20;10M'.repeat(20), top: 4911 }],
    ['tally counts a report with a modifier bit as the wheel', () => tally([input('', [{ b: 64 | 16, x: 1, y: 1 }])]).up, 1],
    ['topAt reads the top before an offset', () => topAt(headLog, 1), 4971],
    ['R1 HEAD: every notch a report, the view older, mode any', () => wheelFindings({ mode: 'any', notches: 20, topBefore: 4971, after: tally(headLog, 1) }), []],
    ['R1 the parent: nothing arrives, in the reporter\'s words', () => wheelFindings({ mode: 'any', notches: 20, topBefore: 4971, after: tally([], 0) }), ['R1 20 wheel notches over a full-screen program on another machine reached it as 0 wheel reports and its view did not move (top line 4971 -> null): nothing scrolls, which is issue 31']],
    ['R1 a mode that never reached xterm is named', () => wheelFindings({ mode: 'none', notches: 20, topBefore: 4971, after: tally(headLog, 1) }).length, 1],
    ['R1 half the notches eaten is named', () => wheelFindings({ mode: 'any', notches: 20, topBefore: 4971, after: tally(headLog.slice(0, 21), 1) }), ['R1 20 wheel notches reached the far program as 10 wheel reports, so 10 were eaten on the way']],
    ['R6 the local control names this Mac and not issue 31', () => wheelFindings({ mode: 'any', notches: 20, topBefore: 4971, after: tally([], 0) }, 'R6'), ['R6 20 wheel notches over a full-screen program on this Mac reached it as 0 wheel reports and its view did not move (top line 4971 -> null)']],
    ['R6 HEAD and the parent: every notch arrives on this Mac', () => wheelFindings({ mode: 'any', notches: 20, topBefore: 4971, after: tally(headLog, 1) }, 'R6'), []],
    ['R1 arrow keys beside the reports are named', () => wheelFindings({ mode: 'any', notches: 20, topBefore: 4971, after: { ...tally(headLog, 1), other: '\x1bOA' } }), ['R1 the far program received 3 bytes that are not mouse reports ("\\u001bOA"), which is the wheel typed as keys']],
    ['R2 HEAD and the parent: nothing typed', () => swallowFindings('R2', { notches: 20, what: 'x', after: tally([], 0), mode: 'none', errors: 0 }), []],
    ['R2 arrow keys reaching a plain program are named', () => swallowFindings('R2', { notches: 20, what: 'a plain program on another machine', after: tally([input('1b4f41')], 0), mode: 'none' }), ['R2 20 wheel notches over a plain program on another machine reached it as 3 bytes ("\\u001bOA"); a program that did not ask for the mouse must receive nothing, because claude and codex read the arrow keys as history']],
    ['R3 a view that moved is named', () => swallowFindings('R3', { notches: 20, what: 'y', after: { bytes: '', top: 4968 }, topBefore: 4971, checkTop: true }).length, 1],
    ['R2 prompt unchanged', () => promptFindings('p320$', 'p320$', 'p320$'), []],
    ['R2 prompt recalled from history is named', () => promptFindings('p320$', 'p320$ echo p320-marker', 'p320$'), ['R2 20 wheel notches over a plain shell on another machine changed its line from "p320$" to "p320$ echo p320-marker": the wheel was typed as keys']],
    ['R2 no prompt to hold is a finding, not a pass', () => promptFindings('', '', 'p320$').length, 1],
    ['R5 HEAD: the count and nothing false', () => panelFindings({ opened: true, text: 'Tortie brought back 44 lines and 2 KB.', allThereEl: false, counts: 'Tortie brought back 44 lines and 2 KB.', title: '' }), []],
    ['R5 the parent: the false sentence and the tooltip', () => panelFindings({ opened: true, text: `Tortie brought back 44 lines. ${FALSE_SENTENCE}`, allThereEl: true, counts: 'Tortie brought back 44 lines.', title: 'Tortie cannot scroll back through a session on another machine. Open this to read the last lines it printed.' }).length, 2],
    ['R5 a panel that did not open is a finding, not a pass', () => panelFindings({ opened: false }).length, 1],
    ['the arms: empty means all five', () => chooseArms(''), { arms: ['R1', 'R2', 'R3', 'R5', 'R6'], bad: [] }],
    ['the arms: R4 was removed with P2 and P3 and is refused by name', () => chooseArms('R4'), { arms: [], bad: ['R4'] }],
    ['the arms: a subset keeps the file\'s order, any case', () => chooseArms('r5, R1'), { arms: ['R1', 'R5'], bad: [] }],
    ['the arms: an unknown name is named', () => chooseArms('R1,R9'), { arms: ['R1'], bad: ['R9'] }],
    ['a notch is three lines and never under 60 px, so xterm never reads it as a trackpad', () => [notchPx(17), notchPx(25), notchPx(0)], [60, 75, 60]],
    ['stale: a build newer than every source is not stale', () => staleSentence([['a.ts', 1000]], ['out/main/index.js', 2000]), null],
    ['stale: no bundle at all is a refusal, not a pass', () => staleSentence([['a.ts', 1000]], null), 'out/ holds no bundle for the sources this run reads; build first.']
  ];
  let ok = true;
  for (const [label, run, want] of fixtures) {
    let got;
    try {
      got = run();
    } catch (err) {
      got = `THREW ${err instanceof Error ? err.message : String(err)}`;
    }
    const good = J(got) === J(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${J(got)}${good ? '' : ` want ${J(want)}`}`);
  }
  say(ok ? `self-test PASS: ${String(fixtures.length)} fixtures behaved` : 'self-test FAIL');
  return ok;
}
if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The refusals, in the order they are asked.
// ---------------------------------------------------------------------------
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p320`, which wraps this file in build/harness-socket.mjs and build/with-scratch-machine.mjs.');
if (socket === 'gmux' || socket === 'default') refuse(`"${socket}" is not a harness socket.`);
if (!socket.startsWith('gmux-p320')) refuse(`"${socket}" is not a gmux-p320 harness socket.`);
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
const { arms: chosen, bad: badArms } = chooseArms(process.env['P320_ARMS']);
if (badArms.length > 0) refuse(`P320_ARMS names ${badArms.join(', ')}; the arms are ${ALL_ARMS.join(', ')}.`);
if (chosen.length === 0) refuse('P320_ARMS chose nothing.');
const on = (arm) => chosen.includes(arm);
const wantsMachine = chosen.some((a) => REMOTE_ARMS.includes(a));

const otherCheckout = (process.env['P320_CHECKOUT'] ?? '').trim();
const checkout = otherCheckout !== '' ? resolve(otherCheckout) : REPO;
const tag = otherCheckout !== '' ? 'checkout' : 'head';
if (!existsSync(join(checkout, 'out', 'main', 'index.js'))) {
  refuse(`${join(checkout, 'out', 'main', 'index.js')} is missing. Build that checkout first.`);
}

/** The sources the readings are made of, per bundle. */
const SCROLL_DIR = join('src', 'renderer', 'terminal', 'scroll');
const RENDERER_SOURCES = [
  join('src', 'renderer', 'terminal', 'TerminalPane.tsx'),
  join('src', 'renderer', 'machines', 'read-lines.ts'),
  join('src', 'renderer', 'app', 'RemoteLinesModal.tsx'),
  join('src', 'renderer', 'app', 'session-actions.tsx')
];
const MAIN_SOURCES = [
  join('src', 'main', 'tmux', 'control-client.ts'),
  join('src', 'main', 'tmux', 'scroll.ts'),
  join('src', 'main', 'sessions', 'core.ts')
];
const SHARED_SOURCES = [join('src', 'shared', 'ipc', 'terminal.ts')];
function readStaleness(dir) {
  const stat = (rel) => [rel, existsSync(join(dir, rel)) ? statSync(join(dir, rel)).mtimeMs : 0];
  const scrollDir = join(dir, SCROLL_DIR);
  const scroll = existsSync(scrollDir)
    ? readdirSync(scrollDir).filter((n) => /\.(?:ts|tsx|css)$/.test(n) && !/\.test\./.test(n)).map((n) => join(SCROLL_DIR, n))
    : [];
  const assets = join(dir, 'out', 'renderer', 'assets');
  let renderer = null;
  if (existsSync(assets)) {
    for (const name of readdirSync(assets)) {
      if (!/^index-[^.]+\.(?:css|js)$/.test(name)) continue;
      const mtime = statSync(join(assets, name)).mtimeMs;
      if (renderer === null || mtime > renderer[1]) renderer = [join('out', 'renderer', 'assets', name), mtime];
    }
  }
  const mainPath = join(dir, 'out', 'main', 'index.js');
  const main = existsSync(mainPath) ? [join('out', 'main', 'index.js'), statSync(mainPath).mtimeMs] : null;
  return (
    staleSentence([...scroll, ...RENDERER_SOURCES, ...SHARED_SOURCES].map(stat), renderer) ??
    staleSentence([...MAIN_SOURCES, ...SHARED_SOURCES].map(stat), main)
  );
}
{
  const stale = readStaleness(checkout);
  if (stale !== null) refuse(`${tag} ${checkout}: ${stale}`);
}
const executable = (name, path) => {
  try {
    accessSync(path, fsConstants.X_OK);
    if (!statSync(path).isFile()) throw new Error('not a file');
  } catch {
    refuse(`${name} ${path} is not an executable file.`);
  }
};
const tmuxOverride = (process.env['GMUX_TMUX_BIN'] ?? '').trim();
if (tmuxOverride !== '') executable('GMUX_TMUX_BIN', tmuxOverride);

/** What build/with-scratch-machine.mjs wrote for this run. */
let carriage = null;
const configRoot = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
if (wantsMachine) {
  try {
    carriage = JSON.parse(readFileSync(join(configRoot, 'p69-carriage.json'), 'utf8'));
  } catch {
    carriage = null;
  }
  if (configRoot === '' || carriage === null) {
    refuse('a remote arm was chosen and there is no p69-carriage.json inside GMUX_CONFIG_ROOT. Run me inside node build/with-scratch-machine.mjs, which `npm run probe:p320` does.');
  }
  if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) {
    refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's own TMUX_TMPDIR, which is not a scratch directory under /tmp.`);
  }
}
const farTmux = (process.env['P320_FAR_TMUX'] ?? '').trim() || (carriage?.remoteTmuxPath ?? '');
if (wantsMachine) executable('P320_FAR_TMUX', farTmux);
const farVersion = wantsMachine ? (spawnSync(farTmux, ['-V'], { encoding: 'utf8' }).stdout ?? '').trim() : null;
const outDir = resolve(REPO, (process.env['P320_OUT_DIR'] ?? '').trim() || join('out', 'p320'));
mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// The scratch world: one local project, one far folder, one HOME, one profile.
// ---------------------------------------------------------------------------
mkdirSync(join(harnessDir, 'p320'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p320'));
const home = join(root, 'h');
const shHome = join(root, 'sh-home');
const project = join(root, 'alpha');
const farProject = join(root, 'far');
const logs = join(root, 'logs');
const profile = join(root, `p-${tag}`);
for (const d of [home, shHome, project, farProject, logs, profile]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}
writeFileSync(join(home, '.zshrc'), "PS1='p320 %# '\n");
writeFileSync(join(home, '.hushlogin'), '');
writeFileSync(join(project, 'README.md'), '# Phase 320, this Mac\n');
writeFileSync(join(farProject, 'README.md'), '# Phase 320, the loopback machine\n');
const LOG = {
  fs: join(logs, 'fullscreen-any.jsonl'),
  alt: join(logs, 'fullscreen-none.jsonl'),
  shRec: join(logs, 'recorder-remote.jsonl'),
  fsLocal: join(logs, 'fullscreen-local.jsonl')
};
const NODE = process.execPath;
const FULLSCREEN = join(HERE, 'fullscreen.mjs');
const RECORDER = join(HERE, 'recorder.mjs');
for (const p of [NODE, FULLSCREEN, RECORDER, farProject, logs]) {
  if (/['\s]/.test(p)) refuse(`${p} holds a quote or a space, and it is typed into a shell as one word.`);
}

const MACHINE_ID = 'p320far';
if (wantsMachine) {
  const configDir = join(profile, 'gmux', 'config');
  mkdirSync(configDir, { recursive: true, mode: 0o700 });
  writeFileSync(
    join(configDir, 'machines.json'),
    `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: 'p320 loopback', host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: farTmux }] })}\n`,
    'utf8'
  );
  const knownMachines = join(profile, 'gmux', 'machines', 'known-machines');
  mkdirSync(dirname(knownMachines), { recursive: true });
  writeFileSync(knownMachines, keyscanText({ host: carriage.host, port: carriage.port, caller: CALLER }), 'utf8');
}

say(`${tag}: measuring ${checkout}, arms ${chosen.join(',')}, socket ${socket}`);
if (wantsMachine) say(`${tag}: the loopback machine on ${String(carriage.host)}:${String(carriage.port)} runs ${farTmux} (${String(farVersion)}), sessions under ${String(carriage.tmuxTmp)}`);

// ---------------------------------------------------------------------------
// The page kit. One expression, evaluated once, that puts this probe's readers
// on window.__p320. The same text at HEAD and at any other checkout. No
// product file gains a hook: the Terminal is found through the React fiber of
// `.gmux-terminal-mount`, as probe:p292 finds it.
// ---------------------------------------------------------------------------
const PAGE_KIT = String.raw`
(() => {
  const findTerm = () => {
    const mount = document.querySelector('.gmux-terminal-mount');
    if (!mount) return null;
    const key = Object.keys(mount).find((k) => k.startsWith('__reactFiber$'));
    if (!key) return null;
    let f = mount[key];
    for (let depth = 0; f && depth < 60; depth += 1, f = f.return) {
      let h = f.memoizedState;
      let n = 0;
      while (h && typeof h === 'object' && n < 300) {
        const ms = h.memoizedState;
        if (ms && typeof ms === 'object' && 'current' in ms) {
          const c = ms.current;
          if (c && typeof c === 'object' && c.buffer && typeof c.write === 'function' && typeof c.rows === 'number' && typeof c.cols === 'number') return c;
        }
        h = h.next;
        n += 1;
      }
    }
    return null;
  };
  const box = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { left: b.left, top: b.top, width: b.width, height: b.height };
  };
  const kit = { term: null };
  kit.ready = () => {
    if (kit.term === null || !kit.term.element || !kit.term.element.isConnected) kit.term = findTerm();
    return kit.term !== null;
  };
  kit.rearm = () => { kit.term = null; return kit.ready(); };
  kit.mode = () => (kit.ready() ? String(kit.term.modes.mouseTrackingMode) : null);
  kit.screen = () => {
    if (!kit.ready()) return null;
    const b = kit.term.buffer.active;
    const rows = [];
    for (let i = 0; i < kit.term.rows; i += 1) {
      const l = b.getLine(b.viewportY + i);
      rows.push(l ? l.translateToString(true) : '');
    }
    const cur = b.getLine(b.baseY + b.cursorY);
    return { rows, cursorRow: cur ? cur.translateToString(true) : null, type: b.type };
  };
  kit.geometry = () => ({
    screen: box(document.querySelector('.xterm-screen')),
    rows: kit.term ? kit.term.rows : null,
    mounts: document.querySelectorAll('.gmux-terminal-mount').length
  });
  kit.button = () => {
    const el = document.querySelector('.strip-readback');
    return el ? { box: box(el), title: el.getAttribute('title'), text: (el.textContent || '').trim() } : null;
  };
  kit.panel = () => {
    const m = document.querySelector('.remote-lines-modal');
    if (!m) return null;
    const counts = m.querySelector('.remote-lines-counts');
    return {
      text: (m.textContent || '').replace(/\s+/g, ' ').trim(),
      counts: counts ? (counts.textContent || '').trim() : null,
      allThereEl: m.querySelector('.remote-lines-all-there') !== null,
      reading: m.querySelector('.remote-lines-reading') !== null,
      empty: m.querySelector('.remote-lines-empty') !== null
    };
  };
  window.__p320 = kit;
  return true;
})()
`;

// ---------------------------------------------------------------------------
// The DevTools side.
// ---------------------------------------------------------------------------
async function cdpForAppWindow(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const a = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxP95 === 'object' ? location.href : null`, 5000);
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
    if (Date.now() - started > timeoutMs) throw new Error('no app window carrying the Phase 95 drive');
    await sleep(250);
  }
}

/** A stand-in's log, one record per line; a half written last line is skipped. */
function records(path) {
  let text = '';
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* the line being appended right now */
    }
  }
  return out;
}

async function waitFor(what, test, ms, every = 200) {
  const started = Date.now();
  for (;;) {
    const got = await test();
    if (got) return got;
    if (Date.now() - started > ms) throw new Error(`${what} did not happen within ${String(ms / 1000)} s`);
    await sleep(every);
  }
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------
const findings = Object.fromEntries([...ALL_ARMS, 'RUN'].map((a) => [a, []]));
const readings = { tag, checkout, socket, arms: chosen, farTmux: wantsMachine ? farTmux : null, farVersion, notes: [] };
const note = (l) => {
  readings.notes.push(l);
  say(`note: ${l}`);
};

/**
 * The loopback machine's own tmux server, ended by the pid it reports through
 * the far binary this run used. build/with-scratch-machine.mjs ends it too
 * when this file exits, through the carriage's binary, and a P320_FAR_TMUX of
 * another version would not answer that reading, which is why this one is
 * here. Called from the `finally` below, and on `exit` as well, because an
 * interrupt that ends this process runs no `finally` and withElectron's own
 * handlers end the process with `process.exit`, which this still hears.
 */
let farEnded = false;
function endFarServer() {
  if (farEnded || !wantsMachine || carriage === null) return;
  farEnded = true;
  const asked = spawnSync(farTmux, ['-L', socket, '-f', '/dev/null', 'display-message', '-p', '#{pid}'], {
    encoding: 'utf8',
    env: { ...process.env, TMUX_TMPDIR: carriage.tmuxTmp }
  });
  const pid = Number((asked.stdout ?? '').trim());
  if (!Number.isInteger(pid) || pid <= 1) return;
  try {
    process.kill(pid, 'SIGKILL');
    say(`ended the loopback machine's tmux server, pid ${String(pid)}`);
  } catch {
    /* already gone */
  }
}
process.on('exit', endFarServer);

try {
  await withElectron(
    {
      label: `p320-${tag}`,
      userDataDir: profile,
      tmuxSocket: socket,
      cwd: checkout,
      args: [
        '--remote-debugging-port=0',
        '--use-mock-keychain',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling'
      ],
      env: withoutDevRenderer({
        HOME: home,
        GMUX_TMUX_SOCKET: socket,
        GMUX_PROBES: '1',
        GMUX_SPECSTORY_NO_CLOUD: '1',
        ...(configRoot !== '' ? { GMUX_CONFIG_ROOT: configRoot } : {}),
        ...(carriage !== null && typeof carriage.authSock === 'string' ? { SSH_AUTH_SOCK: carriage.authSock } : {}),
        ...(tmuxOverride !== '' ? { GMUX_TMUX_BIN: tmuxOverride } : {})
      }),
      graceMs: 8_000,
      ceilingMs: 6 * 60 * 1000
    },
    async (handle) => {
      const { cdp, url } = await cdpForAppWindow(profile, 90_000);
      say(`${tag}: app window at ${url}, pid ${String(handle.appPid())}`);
      /** The scroll refusals the app printed, the operator's own symptom from Phase 95. */
      const scrollErrors = () => handle.text().split('\n').filter((l) => l.includes("handler for 'terminal:scroll")).length;
      const d = (method, ...args) =>
        cdpEval(
          cdp,
          `(async () => { const d = window.__gmuxP95; if (d === undefined) return { missing: true }; return await d.${method}(${args.map((a) => J(a)).join(', ')}); })()`,
          120_000
        );
      const kit = (expr, ms = 5000) => cdpEval(cdp, `window.__p320.${expr}`, ms);
      const photograph = async (name) => {
        try {
          const shot = await cdp.call('Page.captureScreenshot', { format: 'png' }, 20_000);
          if (shot?.result?.data) writeFileSync(join(outDir, `shot-${tag}-${name}.png`), Buffer.from(shot.result.data, 'base64'));
        } catch {
          /* the readings are the evidence; a photograph is the footnote */
        }
      };
      let stage = 'launch';
      try {
        await cdp.call('Runtime.enable');
        await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => undefined);
        await waitFor('the page load', async () => (await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0, 30_000, 50);
        await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
        await sleep(600);
        await cdpEval(cdp, PAGE_KIT);

        /** Show a session and wait until its terminal is the one mounted. */
        const show = async (id) => {
          await d('select', id);
          await waitFor(`the terminal of ${id}`, async () => (await kit('rearm()')) && (await kit('geometry()')).mounts === 1, 20_000);
          return kit('geometry()');
        };
        /** The terminal's centre and one line's height, for the wheel. */
        const centre = async () => {
          const g = await kit('geometry()');
          if (g.screen === null || !(g.rows > 0)) throw new Error('the terminal has no screen to point at');
          return { x: Math.round(g.screen.left + g.screen.width / 2), y: Math.round(g.screen.top + g.screen.height / 2), cell: g.screen.height / g.rows };
        };
        /** `n` real wheel notches toward older lines over the terminal. */
        const wheel = async (n) => {
          const c = await centre();
          await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x, y: c.y });
          for (let i = 0; i < n; i += 1) {
            await cdp.call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: c.x, y: c.y, deltaX: 0, deltaY: -notchPx(c.cell) });
            await sleep(NOTCH_GAP_MS);
          }
          await sleep(1500);
        };
        /** Wait for the shell to draw something, then type one line into it through the bridge. */
        const typeLine = async (line) => {
          await waitFor('a prompt', async () => ((await kit('screen()'))?.rows ?? []).some((r) => r.trim() !== ''), 30_000);
          if (!(await d('type', `${line}\r`))) throw new Error('the drive had no session to type into');
        };
        const launchFullscreen = async (log, mouse) => {
          await typeLine(` exec ${NODE} ${FULLSCREEN} --log ${log} --mouse ${mouse}`);
          await waitFor(`the ${mouse} stand-in to start`, async () => records(log).some((r) => r.kind === 'ready'), 30_000);
        };
        const launchRecorder = async (log) => {
          await typeLine(` exec ${NODE} ${RECORDER} --log ${log}`);
          await waitFor('the recorder to start', async () => records(log).some((r) => r.kind === 'ready'), 30_000);
        };

        // ------------------------------------------------ the loopback machine
        const ids = {};
        if (wantsMachine) {
          stage = 'machine';
          const up = await d('machineUp', MACHINE_ID);
          readings.machine = up;
          if (!(up.rows ?? []).some((r) => r.id === MACHINE_ID && r.usable)) throw new Error(`the loopback machine is not usable: ${J(up).slice(0, 600)}`);
          let opened = null;
          for (let attempt = 1; attempt <= 6; attempt += 1) {
            opened = await d('openRemote', MACHINE_ID, farProject);
            if (opened?.result?.ok === true) break;
            await sleep(3000);
          }
          if (opened?.result?.ok !== true) throw new Error(`the far folder did not open: ${J(opened?.result ?? null).slice(0, 400)}`);
          for (const [key, name, needed] of [
            ['fs', 'p320-fs', on('R1') || on('R5')],
            ['alt', 'p320-alt', on('R3')],
            ['sh', 'p320-sh', on('R2')]
          ]) {
            if (!needed) continue;
            const state = await d('create', { name, agent: 'shell', machineId: MACHINE_ID });
            const row = (state.sessions ?? []).find((s) => s.name === name);
            if (row === undefined || row.machineId !== MACHINE_ID) throw new Error(`${name} did not start on the loopback machine: ${J(state.sessions ?? null).slice(0, 400)}`);
            ids[key] = row.id;
          }
          say(`${tag}: remote sessions ${J(ids)}`);
        }

        // ------------------------------------------------------------- R1
        if (on('R1') || on('R5')) {
          stage = 'R1';
          await show(ids.fs);
          await launchFullscreen(LOG.fs, 'any');
          const mode = await waitFor('xterm to read the far program\'s mouse mode', async () => {
            const m = await kit('mode()');
            return m === 'any' ? m : null;
          }, 10_000).catch(async () => kit('mode()'));
          if (on('R1')) {
            const offset = records(LOG.fs).length;
            const topBefore = topAt(records(LOG.fs), offset);
            const errs = scrollErrors();
            await wheel(NOTCHES);
            const after = tally(records(LOG.fs), offset);
            readings.R1 = { mode, notches: NOTCHES, topBefore, after: { ...after, bytes: shown(after.bytes).slice(0, 400), other: shown(after.other) }, errors: scrollErrors() - errs, modeAfter: await kit('mode()') };
            say(`R1: xterm mode ${String(mode)}; ${String(NOTCHES)} notches -> ${String(after.up)} up and ${String(after.down)} down reports, ${String(after.other.length)} other bytes; top line ${String(topBefore)} -> ${String(after.top)}`);
            findings.R1.push(...wheelFindings({ mode, notches: NOTCHES, topBefore, after }));
            await photograph('R1-fullscreen');
          }

          // ----------------------------------------------------------- R5
          if (on('R5')) {
            stage = 'R5';
            const button = await kit('button()');
            if (button === null || button.box === null) throw new Error('the band draws no Read last lines button over the session on the loopback machine');
            const bx = Math.round(button.box.left + button.box.width / 2);
            const by = Math.round(button.box.top + button.box.height / 2);
            await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: bx, y: by });
            await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: bx, y: by, button: 'left', buttons: 1, clickCount: 1 });
            await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: bx, y: by, button: 'left', buttons: 0, clickCount: 1 });
            let panel = null;
            try {
              panel = await waitFor('the panel to finish its read', async () => {
                const p = await kit('panel()');
                return p !== null && !p.reading && (p.counts !== null || p.empty) ? p : null;
              }, 30_000);
            } catch (err) {
              panel = await kit('panel()');
              note(`R5: ${err instanceof Error ? err.message : String(err)}; the panel read ${J(panel)}`);
            }
            readings.R5 = { button, panel };
            say(`R5: button ${J(button.text)} title ${J(button.title)}; panel counts ${J(panel?.counts ?? null)}, false sentence ${String((panel?.text ?? '').includes(FALSE_SENTENCE))}`);
            findings.R5.push(...panelFindings({ opened: panel !== null, text: panel?.text, allThereEl: panel?.allThereEl, counts: panel?.counts, title: button.title }));
            await photograph('R5-panel');
            await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
            await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
            await sleep(500);
            if ((await kit('panel()')) !== null) note('R5: Escape left the panel open; the arms after this one read under it');
          }
        }

        // ------------------------------------------------------------- R3
        if (on('R3')) {
          stage = 'R3';
          await show(ids.alt);
          await launchFullscreen(LOG.alt, 'none');
          await sleep(800);
          const mode = await kit('mode()');
          const offset = records(LOG.alt).length;
          const topBefore = topAt(records(LOG.alt), offset);
          const errs = scrollErrors();
          await wheel(NOTCHES);
          const after = tally(records(LOG.alt), offset);
          const what = 'a full-screen program on another machine that did not ask for the mouse';
          readings.R3 = { mode, notches: NOTCHES, topBefore, top: after.top, bytes: shown(after.bytes), errors: scrollErrors() - errs };
          say(`R3: xterm mode ${String(mode)}; ${String(NOTCHES)} notches -> ${String(after.bytes.length)} bytes; top line ${String(topBefore)} -> ${String(after.top)}`);
          findings.R3.push(...swallowFindings('R3', { notches: NOTCHES, what, after, mode, topBefore, checkTop: true, errors: scrollErrors() - errs }));
          note(
            'R3 is research 130 §3.3\'s stated gap: a program on the alternate screen that did not ask for the mouse (less, a vim with no mouse) scrolls on this Mac through ' +
              'xterm\'s alternate-scroll keys, and on another machine under slice 1 its wheel is still swallowed, as graded here. Phase 320.1 is what closes it.'
          );
        }

        // ------------------------------------------------------------- R2
        if (on('R2')) {
          stage = 'R2';
          await show(ids.sh);
          const PROMPT = 'p320$';
          await typeLine(
            ` exec /usr/bin/env -i PATH=/usr/bin:/bin HOME=${shHome} TERM="$TERM" BASH_SILENCE_DEPRECATION_WARNING=1 PS1='${PROMPT} ' /bin/sh`
          );
          await waitFor('the plain shell\'s prompt', async () => ((await kit('screen()'))?.cursorRow ?? '').trim() === PROMPT, 20_000);
          // One line in its history, so a wheel handed over as the arrow keys
          // would bring it back onto the prompt.
          await d('type', 'echo p320-marker\r');
          await waitFor('the marker to print and the prompt to return', async () => {
            const s = await kit('screen()');
            return (s?.rows ?? []).some((r) => r.trim() === 'p320-marker') && (s?.cursorRow ?? '').trim() === PROMPT;
          }, 10_000);
          const modeShell = await kit('mode()');
          const before = ((await kit('screen()'))?.cursorRow ?? '').trimEnd();
          const errs = scrollErrors();
          await wheel(NOTCHES);
          const afterRow = ((await kit('screen()'))?.cursorRow ?? '').trimEnd();
          const shellErrors = scrollErrors() - errs;
          say(`R2: the plain shell (xterm mode ${String(modeShell)}) read ${J(before)} before ${String(NOTCHES)} notches and ${J(afterRow)} after`);
          findings.R2.push(...promptFindings(before, afterRow, PROMPT));
          findings.R2.push(...swallowFindings('R2', { notches: NOTCHES, what: 'a plain shell on another machine', after: { bytes: '' }, mode: modeShell, errors: shellErrors }));
          // The recorder, exec'd from that shell, is the byte-exact ruler.
          await launchRecorder(LOG.shRec);
          await sleep(500);
          const modeRec = await kit('mode()');
          const offset = records(LOG.shRec).length;
          const errs2 = scrollErrors();
          await wheel(NOTCHES);
          const after = tally(records(LOG.shRec), offset);
          readings.R2 = { shell: { mode: modeShell, before, after: afterRow, errors: shellErrors }, recorder: { mode: modeRec, bytes: shown(after.bytes), errors: scrollErrors() - errs2 } };
          say(`R2: the recorder (xterm mode ${String(modeRec)}) received ${String(after.bytes.length)} bytes from ${String(NOTCHES)} notches`);
          findings.R2.push(...swallowFindings('R2', { notches: NOTCHES, what: 'a plain program on another machine', after, mode: modeRec, errors: scrollErrors() - errs2 }));
        }

        let localOpen = false;
        const openLocalOnce = async () => {
          if (localOpen) return;
          await d('openLocal', project);
          localOpen = true;
        };
        const createLocal = async (name) => {
          await openLocalOnce();
          const state = await d('create', { name, agent: 'shell' });
          const row = (state.sessions ?? []).find((s) => s.name === name && s.machineId === null);
          if (row === undefined) throw new Error(`the local session ${name} did not start: ${J(state.sessions ?? null).slice(0, 400)}`);
          return row;
        };

        // ------------------------------------------------------------- R6
        if (on('R6')) {
          stage = 'R6';
          const row = await createLocal('p320-fs-local');
          await show(row.id);
          await launchFullscreen(LOG.fsLocal, 'any');
          const mode = await waitFor('xterm to read the local program\'s mouse mode', async () => {
            const m = await kit('mode()');
            return m === 'any' ? m : null;
          }, 10_000).catch(async () => kit('mode()'));
          const offset = records(LOG.fsLocal).length;
          const topBefore = topAt(records(LOG.fsLocal), offset);
          await wheel(NOTCHES);
          const after = tally(records(LOG.fsLocal), offset);
          readings.R6 = { mode, notches: NOTCHES, topBefore, after: { ...after, bytes: shown(after.bytes).slice(0, 400), other: shown(after.other) } };
          say(`R6: xterm mode ${String(mode)}; ${String(NOTCHES)} notches -> ${String(after.up)} up and ${String(after.down)} down reports, ${String(after.other.length)} other bytes; top line ${String(topBefore)} -> ${String(after.top)}`);
          findings.R6.push(...wheelFindings({ mode, notches: NOTCHES, topBefore, after }, 'R6'));
        }
        readings.scrollErrorsTotal = scrollErrors();
        stage = 'done';
      } catch (err) {
        findings.RUN.push(`the run stopped during ${stage}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        try {
          writeFileSync(join(outDir, `app-${tag}.log`), handle.text());
        } catch {
          /* the readings are the evidence; this is the footnote */
        }
        cdp.close();
      }
    }
  );
} catch (err) {
  findings.RUN.push(`the launch did not complete: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  endFarServer();
}

// -- the report ---------------------------------------------------------------
for (const [arm, path] of [['R1', LOG.fs], ['R3', LOG.alt], ['R2', LOG.shRec], ['R6', LOG.fsLocal]]) {
  if (on(arm) && existsSync(path)) readings[`${arm}log`] = path;
}
const readingsPath = join(outDir, `readings-${tag}.json`);
writeFileSync(readingsPath, `${J({ findings, readings })}\n`);
say('');
say(`arm   ${tag.toUpperCase()}${wantsMachine ? `, the loopback machine on ${String(farVersion)}` : ''}`);
for (const arm of [...ALL_ARMS, 'RUN']) {
  const n = findings[arm].length;
  const here = arm === 'RUN' || on(arm);
  say(`${arm.padEnd(5)} ${!here ? 'not run' : n === 0 ? 'PASS' : `FAIL ${String(n)}`}`);
}
say(`readings: ${readingsPath}`);
if (tag === 'checkout') say('this run measured ANOTHER checkout. At the parent R1 and R5 are expected to FAIL and R2, R3 and R6 to pass.');
const failures = [...ALL_ARMS, 'RUN'].flatMap((arm) => findings[arm].map((f) => `${tag.toUpperCase()} ${f}`));
if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${TAG}   ${f}\n`);
  process.stderr.write(`${TAG} ${tag === 'checkout' ? `${checkout} FAILED` : 'FAILED'}: ${String(failures.length)} finding(s).\n`);
  process.exit(1);
}
say(`PASS: ${tag} has 0 findings on ${chosen.join(', ')}.`);
process.exit(0);
