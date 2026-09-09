#!/usr/bin/env node
/**
 * PHASE 245, MEASUREMENT 1. Is a wrapped path reachable from an xterm link
 * provider at all?
 *
 * The question is not rhetorical. `@xterm/addon-web-links`'s LinkComputer
 * already walks UP and DOWN from the hovered row to rejoin a URL split by the
 * terminal, and it does that by asking each buffer line `isWrapped`. So the
 * whole viability of a path link provider turns on one fact: does a path an
 * agent prints, arriving through a real `tmux attach-session` client, land in
 * xterm's buffer as WRAPPED lines, or as separate unwrapped lines?
 *
 * This script answers it by driving the SHIPPING library. It starts a tmux
 * server of its own, attaches a real client under a real pty at a known width,
 * writes both shapes of long line into the pane, feeds the client's bytes into
 * the real `@xterm/xterm` Terminal from node_modules, and reads `isWrapped`
 * off the buffer.
 *
 *   shape A  one long line let out at the pane width, which is what a program
 *            that does not wrap for itself produces (a shell, `ls`, Claude
 *            Code's own prose)
 *   shape B  the same path broken by the PROGRAM at its own width, with the
 *            program's gutter on the continuation row, which is what Codex's
 *            TUI produces and what the issue's screenshot shows
 *
 * It also asks the second half of the question, which is whether the shipping
 * addon can be extended to a path by its `urlRegex` option alone.
 *
 * SAFETY. It only ever touches its own socket, `gmux-p245-<pid>`, never `gmux`
 * and never `default`. The server, the pty and the socket file are ended and
 * unlinked in a `finally` whatever happened. It spawns no agent, spends no
 * token, opens nothing under the person's home, and follows no path it reads.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installDomShim } from './dom-shim.mjs';

const REPO = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const SOCKET = `gmux-p245-${String(process.pid)}`;
const TAG = '[p245]';
const say = (l) => console.log(`${TAG} ${l}`);
const COLS = 60;

if (SOCKET === 'gmux' || SOCKET === 'default') throw new Error('refused: the shared socket');

const TMUX = ['/opt/homebrew/bin/tmux', '/usr/local/bin/tmux', '/usr/bin/tmux'].find((p) => existsSync(p));
if (!TMUX) { console.error(`${TAG} no tmux`); process.exit(2); }

const tmux = (...a) => execFileSync(TMUX, ['-L', SOCKET, ...a], { encoding: 'utf8' });

/** The path both shapes carry. It is created by this script inside its own scratch directory. */
let scratch = '';
let pty = null;
let ok = true;

const results = [];
const note = (name, pass, detail) => {
  results.push({ name, pass, detail });
  say(`${pass ? 'OK  ' : 'FAIL'} ${name} — ${detail}`);
  if (!pass) ok = false;
};

try {
  scratch = mkdtempSync(join(tmpdir(), 'p245-'));
  const deep = join(scratch, 'project', 'src', 'renderer', 'terminal', 'capture');
  execFileSync('/bin/mkdir', ['-p', deep]);
  const target = join(deep, 'test-pattern-1440.png');
  execFileSync('/usr/bin/touch', [target]);
  say(`the path under test is ${String(target.length)} characters, the pane is ${String(COLS)} columns`);

  tmux('-f', '/dev/null', 'new-session', '-d', '-s', 'p245', '-x', String(COLS), '-y', '24', '/bin/sh');
  const pane = tmux('list-panes', '-t', '=p245', '-F', '#{pane_id}').trim().split('\n')[0];

  const { spawn } = await import('node-pty');
  const chunks = [];
  pty = spawn(TMUX, ['-L', SOCKET, '-u', '-f', '/dev/null', 'attach-session', '-t', '=p245'], {
    name: 'xterm-256color', cols: COLS, rows: 24, cwd: scratch, env: { ...process.env, TERM: 'xterm-256color' }
  });
  const allBytes = [];
  pty.onData((d) => { chunks.push(d); allBytes.push(d); });

  const settle = (ms) => new Promise((r) => setTimeout(r, ms));
  await settle(700);

  const runScript = (name, body) => {
    const f = join(scratch, name);
    execFileSync('/bin/sh', ['-c', `cat > ${JSON.stringify(f)} <<'EOSH'\n${body}\nEOSH`]);
    chunks.length = 0;
    tmux('send-keys', '-t', pane, `sh ${f}`, 'Enter');
  };

  // shape A: ONE long line let out at the pane width. The terminal wraps it.
  runScript('a.sh', `printf 'AAA %s\\n' ${JSON.stringify(target)}`);
  await settle(800);
  const streamA = chunks.join('');

  // shape B: the PROGRAM breaks the path itself at its own width and puts its
  // own gutter on the continuation row. This is what Codex's TUI does, and it
  // is the shape in the issue's screenshot.
  const whole = `BBB ${target}`;
  const head = whole.slice(0, COLS - 8);
  const tail = whole.slice(COLS - 8);
  runScript('b.sh', `printf '%s\\n  \\342\\224\\202 %s\\n' ${JSON.stringify(head)} ${JSON.stringify(tail)}`);
  await settle(800);
  const streamB = chunks.join('');

  // shape C: shape A again, then SCROLLED BACK the way Tortie scrolls, which
  // is tmux copy-mode. copy-mode REDRAWS the visible rows, so this arm asks
  // whether the wrap flag survives the redraw a person triggers by scrolling
  // to the line they want to click.
  runScript('c.sh', `printf 'CCC %s\\n' ${JSON.stringify(target)}; i=0; while [ $i -lt 40 ]; do echo "filler $i"; i=$((i+1)); done`);
  await settle(900);
  // CCC is now well off the top of the 24 row screen. Scrolling it back into
  // view is the gesture a person makes to reach a path an agent printed a
  // moment ago, and it is the gesture this arm measures.
  chunks.length = 0;
  tmux('copy-mode', '-e', '-t', pane);
  tmux('send-keys', '-t', pane, '-X', '-N', '30', 'scroll-up');
  await settle(900);
  const streamC = chunks.join('');
  // The FAITHFUL arm: one terminal fed every byte the client ever wrote, so
  // the CCC row is first written by live output WITH its wrap flag and then
  // painted over by the copy-mode redraw, exactly as the running app's xterm
  // sees it. The redraw-only stream above would flatter the reading.
  const streamAll = allBytes.join('');
  tmux('send-keys', '-t', pane, '-X', 'cancel');

  say(`shape A ${String(streamA.length)} bytes, shape B ${String(streamB.length)} bytes, shape C (copy-mode redraw) ${String(streamC.length)} bytes`);

  installDomShim();
  const { Terminal } = await import(join(REPO, 'node_modules', '@xterm', 'xterm', 'lib', 'xterm.mjs'));

  /** Feed one stream into a fresh Terminal and read every row with its wrap flag. */
  async function rowsOf(stream) {
    const t = new Terminal({ cols: COLS, rows: 24, scrollback: 5000, allowProposedApi: true });
    await new Promise((r) => t.write(stream, r));
    const b = t.buffer.active;
    const out = [];
    for (let y = 0; y < b.length; y++) {
      const line = b.getLine(y);
      if (!line) continue;
      out.push({ y, wrapped: line.isWrapped, text: line.translateToString(true) });
    }
    return { term: t, rows: out };
  }

  const A = await rowsOf(streamA);
  const B = await rowsOf(streamB);
  const C = await rowsOf(streamC);
  const ALL = await rowsOf(streamAll);

  const marked = (rows, mark) => {
    const i = rows.findIndex((r) => r.text.includes(mark) && !r.text.includes('printf'));
    return i < 0 ? null : { first: rows[i], next: rows[i + 1] ?? null };
  };

  const a = marked(A.rows, 'AAA ');
  note(
    'shape A, live output the TERMINAL wrapped: the continuation row is marked isWrapped',
    a !== null && a.next !== null && a.next.wrapped === true,
    a === null ? 'the line was not found' : `row ${String(a.first.y)} isWrapped=${String(a.first.wrapped)}, continuation row isWrapped=${String(a.next?.wrapped)}`
  );

  const b = marked(B.rows, 'BBB ');
  note(
    'shape B, output the PROGRAM wrapped: the continuation row is NOT marked isWrapped',
    b !== null && b.next !== null && b.next.wrapped === false,
    b === null ? 'the line was not found' : `row ${String(b.first.y)} isWrapped=${String(b.first.wrapped)}, continuation row isWrapped=${String(b.next?.wrapped)} carrying ${JSON.stringify(b.next?.text.slice(0, 20))}`
  );

  const c = marked(C.rows, 'CCC ');
  note(
    'shape C, the copy-mode redraw ON ITS OWN carries no wrap flag',
    c !== null && c.next !== null && c.next.wrapped === false,
    c === null ? 'the line was not found in the redraw' : `row ${String(c.first.y)} isWrapped=${String(c.first.wrapped)}, continuation row isWrapped=${String(c.next?.wrapped)}`
  );

  // The faithful reading: one terminal, every byte, live output first and the
  // redraw over it. This is the one that decides, because it is what the
  // running app's buffer really holds when a person scrolls back to a path.
  const wrappedRows = (rows, mark) => {
    const hits = rows.filter((r) => r.text.includes(mark) && !r.text.includes('printf'));
    return hits.map((r) => ({ y: r.y, next: rows.find((q) => q.y === r.y + 1)?.wrapped ?? null }));
  };
  const liveA = wrappedRows(ALL.rows, 'AAA ');
  const afterC = wrappedRows(ALL.rows, 'CCC ');
  note(
    'the SAME terminal: a wrapped line SCROLLED BACK INTO VIEW has lost its wrap flag',
    afterC.length > 0 && afterC.every((r) => r.next === false),
    `CCC rows ${JSON.stringify(afterC)} after the scroll; AAA rows ${JSON.stringify(liveA)} for comparison`
  );

  const aFirst = a?.first ?? null;
  const term = A.term;

  // -- THE LAST DOOR: what does a SELECTION recover? -----------------------
  //
  // A link provider is not the only gesture available. A person can SELECT the
  // path and act on it through the terminal's own context menu, and a
  // selection is the one span the PERSON defines rather than the buffer, so it
  // looked like the way around shape C. It is not, and the reason is in the
  // shipping bundle: xterm's own selection text builder joins two rows into
  // ONE string only when the second is `isWrapped`, and pushes a new element
  // otherwise, which the builder then joins with a line break. That is the
  // SAME flag the link machinery asks for, so a selection across a
  // program-wrapped or scrolled-back path recovers a string with a newline —
  // and, in a Codex pane, the program's gutter — buried inside the path.
  //
  // It is read out of the bundle rather than driven, because `getSelection()`
  // needs a terminal that has been `open()`ed against a real document and this
  // probe is headless by design. The headless answer is asserted too, so a
  // later reader cannot mistake an empty string for a measurement.
  const XTERM_JS = join(REPO, 'node_modules', '@xterm', 'xterm', 'lib', 'xterm.js');
  const bundle = readFileSync(XTERM_JS, 'utf8');
  const JOINS_BY_WRAP = /isWrapped\?\s*(\w+)\[\1\.length-1\]\s*\+=\s*\w+\s*:\s*\1\.push\(/;
  note(
    "xterm's own SELECTION joins rows by the SAME isWrapped flag, so selecting is no way round shape B or shape C",
    JOINS_BY_WRAP.test(bundle),
    JOINS_BY_WRAP.test(bundle)
      ? 'the selection text builder appends to the previous row when isWrapped and pushes a new element otherwise, and the elements are joined with a line break'
      : 'the construct was not found — the bundle has changed and this reading must be re-derived'
  );
  const headlessSel = (() => {
    try { A.term.selectLines(0, 1); return A.term.getSelection(); } catch { return null; }
  })();
  note(
    'and the live selection cannot be driven headlessly, so the reading above is a source reading and is labelled as one',
    headlessSel === '' || headlessSel === null,
    `a headless Terminal answers getSelection() = ${JSON.stringify(headlessSel)} because the selection service needs a terminal that has been open()ed`
  );

  // -- what the shipping addon does with each ------------------------------
  const { WebLinksAddon } = await import(join(REPO, 'node_modules', '@xterm', 'addon-web-links', 'lib', 'addon-web-links.mjs'));
  const provided = new Map();
  const stub = {
    registerLinkProvider(p) { provided.set('p', p); return { dispose() {} }; },
    buffer: term.buffer,
    options: term.options
  };
  // A path regex handed to the addon through its ONE extension point.
  const addon = new WebLinksAddon(() => {}, { urlRegex: /(?:\/[A-Za-z0-9._-]+)+/ });
  addon.activate(stub);
  const provider = provided.get('p');
  const askAt = (y) => new Promise((r) => provider.provideLinks(y + 1, (links) => r(links ?? [])));
  const aLinks = aFirst ? await askAt(aFirst.y) : [];
  note(
    "the addon's urlRegex option cannot make it match a bare path",
    aLinks.length === 0,
    `the addon returned ${String(aLinks.length)} links for the wrapped path row; its LinkComputer filters every match through new URL(), which a bare path fails`
  );

  const httpTerm = new Terminal({ cols: COLS, rows: 8, allowProposedApi: true });
  await new Promise((r) => httpTerm.write('see https://example.invalid/a/very/long/path/that/wraps/over.html now\r\n', r));
  const provided2 = new Map();
  const stub2 = { registerLinkProvider(p) { provided2.set('p', p); return { dispose() {} }; }, buffer: httpTerm.buffer, options: httpTerm.options };
  new WebLinksAddon(() => {}).activate(stub2);
  const p2 = provided2.get('p');
  const hLinks = await new Promise((r) => p2.provideLinks(2, (l) => r(l ?? [])));
  note(
    'the addon DOES rejoin a wrapped http URL, which is the machinery a path would need',
    hLinks.length === 1 && hLinks[0].range.start.y !== hLinks[0].range.end.y,
    hLinks.length === 0 ? 'no link' : `one link spanning rows ${String(hLinks[0].range.start.y)}→${String(hLinks[0].range.end.y)}`
  );

  // -- the cost -----------------------------------------------------------
  const costTerm = new Terminal({ cols: 120, rows: 40, scrollback: 20000, allowProposedApi: true });
  const filler = [];
  for (let i = 0; i < 5000; i++) {
    filler.push(`  ⏺ Bash(cd /Users/x/proj-${String(i % 7)}; sed -n 1,40p docs/research/${String(i % 90)}-a-fairly-long-file-name.md)\r\n`);
  }
  await new Promise((r) => costTerm.write(filler.join(''), r));
  const provided3 = new Map();
  const stub3 = { registerLinkProvider(p) { provided3.set('p', p); return { dispose() {} }; }, buffer: costTerm.buffer, options: costTerm.options };
  new WebLinksAddon(() => {}).activate(stub3);
  const p3 = provided3.get('p');
  const N = 2000;
  const t0 = process.hrtime.bigint();
  for (let i = 1; i <= N; i++) await new Promise((r) => p3.provideLinks(i, () => r()));
  const t1 = process.hrtime.bigint();
  const per = Number(t1 - t0) / 1e6 / N;
  note(
    'the cost of one provideLinks call over a realistic buffer',
    per < 1,
    `${per.toFixed(4)} ms per line over ${String(N)} lines of a ${String(costTerm.buffer.active.length)} line buffer, and xterm asks providers ON HOVER (per cell the pointer enters), not per render`
  );

  console.log('');
  say(`${String(results.filter((r) => r.pass).length)} of ${String(results.length)} readings as expected`);
} finally {
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
