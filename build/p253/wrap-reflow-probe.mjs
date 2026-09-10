#!/usr/bin/env node
/**
 * PHASE 253, MEASUREMENT B. DOES VS CODE'S WRAPPED-LINE JOIN SURVIVE TMUX?
 *
 * VS Code's TerminalLinkDetectorAdapter assembles the "line" it hands every
 * detector by walking UP and DOWN from the hovered row while each buffer line
 * answers `isWrapped` (terminalLinkDetectorAdapter.ts:80-89 at 770a9bce),
 * capped at ceil(max(500, cols)/cols) rows of context each side. That is the
 * whole of its wrapped-path story, and it works there because VS Code's xterm
 * IS the terminal: its buffer holds the scrollback and nothing repaints it.
 *
 * TORTIE'S XTERM IS A TMUX CLIENT PARKED IN THE ALTERNATE BUFFER
 * (src/main/tmux/sessions.ts:297, TerminalPane.tsx:20), which holds EXACTLY
 * the visible screen and no scrollback at all — the history lives in tmux.
 * So the question is not "is the flag sometimes right" but "on which rows can
 * the flag exist at all". This probe measures the five states a wrapped line
 * passes through under the app's own tmux shape (status off, the two lines of
 * resources/gmux-tmux.conf that decide what the client sees):
 *
 *   arm 1  live output, still on screen           — the only place VS Code's
 *          machinery could work
 *   arm 2  a FRESH ATTACH repainting the same screen (what a window reload,
 *          a restore or a second client sees)
 *   arm 3  the line scrolled OFF the visible screen — is it in the buffer?
 *   arm 4  a RESIZE, which makes tmux reflow and repaint (opening an editor
 *          tab narrows every pane: probe:p247 measured 144 -> 78)
 *   arm 5  the copy-mode redraw a person scrolls with (research 107 shape C)
 *
 * Each arm rebuilds a fresh headless Terminal from the exact bytes the client
 * had received by that point, with `resize` applied at the same place in the
 * stream the app's xterm would apply it.
 *
 * SAFETY. Its own socket `gmux-p253-<pid>`, never `gmux`, never `default`.
 * Both ptys, the server and the socket file are ended and unlinked in a
 * `finally`. No agent, no token, nothing read under the person's home.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installDomShim } from '../p245/dom-shim.mjs';

const REPO = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const SOCKET = `gmux-p253-${String(process.pid)}`;
const TAG = '[p253b]';
const say = (l) => console.log(`${TAG} ${l}`);
const WIDE = 100;
const NARROW = 64;

if (SOCKET === 'gmux' || SOCKET === 'default') throw new Error('refused: the shared socket');
const TMUX = ['/opt/homebrew/bin/tmux', '/usr/local/bin/tmux', '/usr/bin/tmux'].find((p) => existsSync(p));
if (!TMUX) { console.error(`${TAG} no tmux`); process.exit(2); }
const tmux = (...a) => execFileSync(TMUX, ['-L', SOCKET, ...a], { encoding: 'utf8' });

let scratch = '';
let pty = null;
let pty2 = null;
let ok = true;
const results = [];
const note = (name, pass, detail) => {
  results.push({ name, pass });
  say(`${pass ? 'OK  ' : 'FAIL'} ${name} — ${detail}`);
  if (!pass) ok = false;
};

try {
  scratch = mkdtempSync(join(tmpdir(), 'p253b-'));
  const deep = join(scratch, 'project', 'src', 'renderer', 'terminal', 'capture', 'deeper', 'and', 'deeper');
  execFileSync('/bin/mkdir', ['-p', deep]);
  const target = join(deep, 'a-quite-long-file-name-that-must-wrap.md');
  execFileSync('/usr/bin/touch', [target]);
  say(`the path under test is ${String(target.length)} characters; pane ${String(WIDE)} then ${String(NARROW)} columns`);

  tmux('-f', '/dev/null', 'new-session', '-d', '-s', 'p253', '-x', String(WIDE), '-y', '24', '/bin/sh');
  // the two lines of resources/gmux-tmux.conf that decide what the attached
  // client's xterm holds. They do not change the alternate-buffer fact; they
  // make the scratch server the app's shape rather than the tmux default.
  tmux('set', '-g', 'status', 'off');
  tmux('set', '-g', 'history-limit', '25000');
  const pane = tmux('list-panes', '-t', '=p253', '-F', '#{pane_id}').trim().split('\n')[0];

  const { spawn } = await import('node-pty');
  pty = spawn(TMUX, ['-L', SOCKET, '-u', '-f', '/dev/null', 'attach-session', '-t', '=p253'], {
    name: 'xterm-256color', cols: WIDE, rows: 24, cwd: scratch, env: { ...process.env, TERM: 'xterm-256color' }
  });
  /** checkpointed byte stream: mark() closes a segment so a terminal can be
   *  rebuilt from exactly what the client had at that point. */
  const segments = [{ bytes: [], resizeTo: null }];
  pty.onData((d) => { segments[segments.length - 1].bytes.push(d); });
  const mark = (resizeTo = null) => { segments.push({ bytes: [], resizeTo }); };
  const settle = (ms) => new Promise((r) => setTimeout(r, ms));
  await settle(700);

  const sh = (name, body) => {
    const f = join(scratch, name);
    execFileSync('/bin/sh', ['-c', `cat > ${JSON.stringify(f)} <<'EOSH'\n${body}\nEOSH`]);
    tmux('send-keys', '-t', pane, `sh ${f}`, 'Enter');
  };

  installDomShim();
  const { Terminal } = await import(join(REPO, 'node_modules', '@xterm', 'xterm', 'lib', 'xterm.mjs'));

  /** a fresh terminal fed segments [0..upto], resized where the client was. */
  async function terminalUpTo(upto) {
    const t = new Terminal({ cols: WIDE, rows: 24, scrollback: 5000, allowProposedApi: true });
    for (let i = 0; i <= Math.min(upto, segments.length - 1); i += 1) {
      const seg = segments[i];
      if (seg.resizeTo !== null) t.resize(seg.resizeTo, 24);
      await new Promise((r) => t.write(seg.bytes.join(''), r));
    }
    return t;
  }
  const rowsOf = (t) => {
    const b = t.buffer.active;
    const out = [];
    for (let y = 0; y < b.length; y += 1) {
      const line = b.getLine(y);
      if (line) out.push({ y, wrapped: line.isWrapped, text: line.translateToString(true) });
    }
    return out;
  };
  const pathRows = (rows) => rows.filter((r) => r.text.includes('WRAPME ') && !r.text.includes('printf') && !r.text.includes('sh '));
  const flagJoin = (rows, startY) => {
    let text = '';
    let y = startY;
    do { text += (rows.find((q) => q.y === y)?.text ?? ''); y += 1; }
    while (rows.find((q) => q.y === y)?.wrapped === true);
    return text;
  };

  // ---- arm 1: live output, on screen --------------------------------------
  sh('a.sh', `printf 'WRAPME %s\\n' ${JSON.stringify(target)}`);
  await settle(800);
  const seg1 = segments.length - 1;
  {
    const t = await terminalUpTo(seg1);
    const rows = rowsOf(t);
    const hits = pathRows(rows);
    const recovered = hits.some((r) => flagJoin(rows, r.y).includes(target));
    note('arm 1: LIVE and still on screen — the flag is there and a VS Code join reconstructs the path',
      hits.length > 0 && recovered,
      `buffer holds ${String(rows.length)} rows (the visible screen: this client is in the ALTERNATE buffer), flag-join recovers the path: ${String(recovered)}`);
  }

  // ---- arm 2: what a fresh attach sees for the same screen -----------------
  {
    const chunks2 = [];
    pty2 = spawn(TMUX, ['-L', SOCKET, '-u', '-f', '/dev/null', 'attach-session', '-t', '=p253'], {
      name: 'xterm-256color', cols: WIDE, rows: 24, cwd: scratch, env: { ...process.env, TERM: 'xterm-256color' }
    });
    pty2.onData((d) => { chunks2.push(d); });
    await settle(800);
    const t = new Terminal({ cols: WIDE, rows: 24, scrollback: 5000, allowProposedApi: true });
    await new Promise((r) => t.write(chunks2.join(''), r));
    const rows = rowsOf(t);
    const hits = pathRows(rows);
    const anyFlag = hits.some((r) => rows.find((q) => q.y === r.y + 1)?.wrapped === true);
    const recovered = hits.some((r) => flagJoin(rows, r.y).includes(target));
    note('arm 2: a FRESH ATTACH repainting the same screen — what a reload or restore sees',
      hits.length > 0,
      `the same wrapped line, repainted: continuation isWrapped=${String(anyFlag)}, flag-join recovers the path: ${String(recovered)}`);
    try { pty2.kill(); } catch { /* gone */ }
    pty2 = null;
  }

  // ---- arm 3: the line scrolls off the visible screen ----------------------
  mark();
  sh('burst.sh', 'i=0\nwhile [ $i -lt 30 ]; do\n  echo "filler line $i"\n  i=$((i+1))\ndone');
  await settle(900);
  const seg3 = segments.length - 1;
  {
    const t = await terminalUpTo(seg3);
    const rows = rowsOf(t);
    const hits = pathRows(rows);
    note('arm 3: SCROLLED OFF the screen — the alternate buffer holds nothing to join',
      hits.length === 0,
      `path rows still in xterm's buffer: ${String(hits.length)} of a ${String(rows.length)}-row buffer; the history is tmux's, not xterm's`);
  }

  // ---- arm 4: the resize reflow -------------------------------------------
  // bring the path back on screen first, then resize so tmux reflows it
  sh('b.sh', `printf 'WRAPME %s\\n' ${JSON.stringify(target)}`);
  await settle(700);
  mark(NARROW);
  pty.resize(NARROW, 24);
  await settle(1000);
  const seg4 = segments.length - 1;
  {
    const t = await terminalUpTo(seg4);
    const rows = rowsOf(t);
    const hits = pathRows(rows);
    const anyFlag = hits.some((r) => rows.find((q) => q.y === r.y + 1)?.wrapped === true);
    const recovered = hits.some((r) => flagJoin(rows, r.y).includes(target));
    // tmux's own belief at the new width
    const plain = tmux('capture-pane', '-p', '-N', '-t', pane).split('\n');
    const joined = tmux('capture-pane', '-p', '-J', '-t', pane);
    const tmuxHit = plain.findIndex((r) => r.includes('WRAPME ') && !r.includes('printf') && !r.includes('sh '));
    const tmuxWrapped = tmuxHit >= 0 && (plain[tmuxHit] ?? '').length > 0 && (plain[tmuxHit + 1] ?? '').length > 0
      && joined.includes((plain[tmuxHit] ?? '') + (plain[tmuxHit + 1] ?? '').slice(0, 20));
    note('arm 4: after the RESIZE REFLOW tmux repaints the screen — tmux still knows the line wrapped, and the flag reads',
      tmuxWrapped,
      `tmux -J joins it: ${String(tmuxWrapped)}; xterm continuation isWrapped=${String(anyFlag)}; flag-join recovers the path: ${String(recovered)} (${String(hits.length)} path rows visible)`);
  }

  // ---- arm 5: the copy-mode redraw a person scrolls with -------------------
  sh('c.sh', 'i=0\nwhile [ $i -lt 16 ]; do\n  echo "more filler $i"\n  i=$((i+1))\ndone');
  await settle(800);
  mark();
  tmux('copy-mode', '-e', '-t', pane);
  // scroll up a few rows at a time until the path line is inside the repainted
  // view, so the reading is about the repaint rather than about aim
  let rows = [];
  let hits = [];
  for (let i = 0; i < 20; i += 1) {
    tmux('send-keys', '-t', pane, '-X', '-N', '4', 'scroll-up');
    await settle(250);
    const t = await terminalUpTo(segments.length - 1);
    rows = rowsOf(t);
    hits = pathRows(rows);
    if (hits.length > 0) break;
  }
  {
    const anyFlag = hits.some((r) => rows.find((q) => q.y === r.y + 1)?.wrapped === true);
    const recovered = hits.some((r) => flagJoin(rows, r.y).includes(target));
    note('arm 5: the COPY-MODE redraw a person scrolls with carries no flag (research 107 shape C, reproduced)',
      hits.length > 0 && !recovered,
      `path rows repainted into view: ${String(hits.length)}; continuation isWrapped=${String(anyFlag)}; flag-join recovers the path: ${String(recovered)}`);
  }
  tmux('send-keys', '-t', pane, '-X', 'cancel');

  console.log('');
  say(`${String(results.filter((r) => r.pass).length)} of ${String(results.length)} readings as expected`);
} finally {
  try { pty2?.kill(); } catch { /* already gone */ }
  try { pty?.kill(); } catch { /* already gone */ }
  try { spawnSync(TMUX, ['-L', SOCKET, 'kill-server'], { stdio: 'ignore' }); } catch { /* none */ }
  for (const base of [process.env['TMUX_TMPDIR'], `/private/tmp/tmux-${String(process.getuid?.() ?? 501)}`, `/tmp/tmux-${String(process.getuid?.() ?? 501)}`]) {
    if (!base) continue;
    const f = join(base, SOCKET);
    try { if (existsSync(f)) unlinkSync(f); } catch { /* gone */ }
  }
  if (scratch) { try { rmSync(scratch, { recursive: true, force: true }); } catch { /* gone */ } }
}
process.exit(ok ? 0 : 1);
