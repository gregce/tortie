#!/usr/bin/env node
/**
 * THE PHASE 250 VERIFIER'S OWN ATTACK, READ OFF THE RUNNING APP.
 *
 * Independent of the builder's `build/p247/path-open.mjs`: its own fixture, its
 * own shapes and its own assertions. The shapes are the ones Phase 250's new
 * surface earns and that the builder's arms do not carry — a relative path
 * climbing out with `../../..`, a relative path resolving onto a SYMLINK that
 * leaves the base (a linked directory and a linked leaf, which are two
 * different escapes), a LINE-ENDING path that is really a bundle, a
 * LINE-ENDING path with the executable bit, `auth.json` written relatively, a
 * relative directory, and a relative `.pdf`.
 *
 * ONE Electron, on a scratch profile with a scratch HOME and this script's own
 * tmux socket, over a project it builds inside its own scratch directory. It
 * spawns no agent, spends no token, opens no keychain and makes no request.
 *
 * **NOTHING IS EVER OPENED BY macOS.** `GMUX_PATH_OPEN_RECORD` is set for the
 * whole run, so the external door appends one JSON line and STARTS NOTHING.
 * The run asserts the count that matters as a COUNT: of every line the stub
 * recorded, ZERO name a kind the allowlist does not name.
 *
 * THE CONTROLS ARE WHY A REFUSAL READS AS A REFUSAL. Three arms must OPEN — a
 * relative path mid-sentence, a relative path that ENDS its row, and an
 * absolute `.pdf` that must reach the stub — so a build that refused
 * everything fails this run rather than passing it.
 *
 *   node build/harness-socket.mjs --fresh gmux-p250v 'node build/p250/verify-attack.mjs'
 */
import { spawnSync } from 'node:child_process';
import {
  chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p250v]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '' || socket === 'gmux' || socket === 'default') {
  console.error(`${TAG} refusing socket "${socket}"; wrap in build/harness-socket.mjs`);
  process.exit(2);
}
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') {
  console.error(`${TAG} no GMUX_HARNESS_DIR`);
  process.exit(2);
}
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} out/main/index.js is missing. Run npm run build.`);
  process.exit(2);
}

const operatorCount = () =>
  (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '')
    .split('\n')
    .filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();

// ---------------------------------------------------------------------------
// The scratch world.
// ---------------------------------------------------------------------------
mkdirSync(join(harnessDir, 'p250v'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p250v'));
const home = join(root, 'h');
const profile = join(root, 'p');
const project = join(root, 'w');
const outside = join(root, 'outside');
for (const d of [home, profile, project, outside]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}
const record = join(root, 'opened.jsonl');
rmSync(record, { force: true });

const rel = (p, body, mode) => {
  const full = join(project, p);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, body);
  if (mode !== undefined) chmodSync(full, mode);
  return full;
};
rel('docs/ok.md', '# the control\n');
rel('docs/ends.md', '# the control that ends its row\n');
rel('docs/tool.md', '# looks like prose, carries the bit\n', 0o755);
rel('docs/tool2.md', '# the same, at the end of a row\n', 0o755);
rel('config/auth.json', '{"token":"not a real one"}\n');
const ABS_PDF = rel('docs/paper.pdf', '%PDF-1.4 not really\n');
// two bundles wearing a drawable suffix: one pressed mid-row, one at a row end
for (const b of ['docs/thing.png', 'docs/thing2.png']) {
  mkdirSync(join(project, b, 'Contents'), { recursive: true });
  writeFileSync(join(project, b, 'Contents', 'Info.plist'), '<plist/>\n');
}
writeFileSync(join(outside, 'stolen.md'), '# outside the base\n');
// a linked DIRECTORY inside the project whose target leaves it
symlinkSync(outside, join(project, 'link'));
// a link inside the project whose LEAF is a file outside it
symlinkSync(join(outside, 'stolen.md'), join(project, 'docs', 'shortcut.md'));

/**
 * marker, what the row says after the marker, what must be open afterwards,
 * and how many NEW lines the stub must have recorded.
 *
 * A row that does not end with the path carries the word `end` after it, so
 * refusal 8 can never be the clause that refused an arm meant to test another.
 */
const CLIMB = `${'../'.repeat(30)}etc/hosts`;
const ARMS = [
  ['vA', 'docs/ok.md end', 'docs/ok.md', ['ok.md'], 0, 'CONTROL: a relative path mid-sentence'],
  ['vB', 'link/stolen.md end', 'link/stolen.md', [], 0, 'a symlinked DIRECTORY leaving the base'],
  ['vC', 'docs/shortcut.md end', 'docs/shortcut.md', [], 0, 'a symlinked LEAF leaving the base'],
  ['vD', `${CLIMB} end`, CLIMB, [], 0, 'a relative climb of thirty levels onto a real system file'],
  ['vE', 'docs/thing.png end', 'docs/thing.png', [], 0, 'a bundle wearing a .png suffix, relative'],
  ['vF', 'docs/tool.md end', 'docs/tool.md', [], 0, 'the executable bit on a .md, relative'],
  ['vG', 'config/auth.json end', 'config/auth.json', [], 0, 'auth.json, relative'],
  ['vH', 'docs/paper.pdf end', 'docs/paper.pdf', [], 0, 'a .pdf, relative — the Mac door is closed'],
  ['vI', 'docs end', 'docs', [], 0, 'a directory, relative'],
  ['vJ', 'docs/ends.md', 'docs/ends.md', ['ends.md'], 0, 'CONTROL: a relative path that ENDS its row'],
  ['vK', 'docs/tool2.md', 'docs/tool2.md', [], 0, 'the executable bit at the END of a row'],
  ['vL', 'docs/thing2.png', 'docs/thing2.png', [], 0, 'a bundle at the END of a row'],
  ['vN', `${ABS_PDF} end`, ABS_PDF, [], 1, 'CONTROL: an ABSOLUTE .pdf, which must reach the stub']
];

const recordLines = () => {
  if (!existsSync(record)) return [];
  return readFileSync(record, 'utf8').split('\n').filter((l) => l.trim() !== '');
};

const tmux = (...a) =>
  (spawnSync('tmux', ['-L', socket, ...a], { encoding: 'utf8' }).stdout ?? '').trimEnd();

const paneIdOf = (name) => {
  const row = tmux('list-panes', '-a', '-F', '#{session_name}\t#{pane_id}')
    .split('\n')
    .find((l) => l.startsWith(`${name}\t`));
  return row === undefined ? null : (row.split('\t')[1] ?? null);
};

const capture = (pane) =>
  (
    spawnSync('tmux', ['-L', socket, 'capture-pane', '-p', '-t', pane], { encoding: 'utf8' })
      .stdout ?? ''
  ).split('\n');

/** Rows read until two consecutive reads agree, so a reflow has landed. */
async function settledCapture(pane) {
  let last = capture(pane).join('\n');
  for (let i = 0; i < 10; i += 1) {
    await sleep(500);
    const now = capture(pane).join('\n');
    if (now === last) return now.split('\n');
    last = now;
  }
  return last.split('\n');
}

const TABS = `Array.from(document.querySelectorAll('.ed-tab .ed-tab-name')).map((t) => (t.textContent ?? '').trim())`;
const SCREEN = `(() => {
  const s = document.querySelector('.gmux-terminal-pane .xterm-screen');
  if (!s) return null;
  const r = s.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
})()`;

async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch { port = 0; }
    if (port > 0) {
      let list = [];
      try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { list = []; }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl, {
            collect: ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown']
          });
          const a = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`,
            5000
          );
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch {
          if (cdp) { try { cdp.close(); } catch { /* already closed */ } }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}

const drive = (cdp, spec) =>
  cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 180000);

async function closeAllTabs(cdp) {
  for (let i = 0; i < 16; i += 1) {
    const empty = await cdpEval(
      cdp,
      `(() => { const b = document.querySelector('.ed-tab-close'); if (b) b.click(); return document.querySelectorAll('.ed-tab').length === 0; })()`,
      10000
    );
    if (empty === true) break;
    await sleep(250);
  }
  await sleep(1500);
}

async function geometryNow(cdp, pane) {
  const screen = await cdpEval(cdp, SCREEN, 10000);
  const line = tmux('list-panes', '-a', '-F', '#{pane_id} #{pane_width} #{pane_height}')
    .split('\n')
    .find((l) => l.startsWith(`${pane} `));
  const size = (line ?? '').split(' ').slice(1).map((n) => Number.parseInt(n, 10));
  if (screen === null || !Number.isFinite(size[0]) || size[0] <= 0) return null;
  return {
    left: screen.left, top: screen.top,
    cellW: screen.width / size[0], cellH: screen.height / size[1], cols: size[0]
  };
}

/**
 * WHERE THE TOKEN REALLY STARTS, ASKED OF tmux RATHER THAN MODELLED.
 *
 * Every fixture row here is pure ASCII, so the marked row's string index IS
 * its cell column; the run asserts that rather than assuming it, by printing
 * the row and refusing a row that carries any byte outside printable ASCII.
 */
function cellOf(rows, marker, token) {
  for (const [y, text] of rows.entries()) {
    if (!text.startsWith(`${marker} `)) continue;
    const at = text.indexOf(token, marker.length + 1);
    if (at < 0) return { row: y, text, col: null, width: 0 };
    return { row: y, text, col: at, width: token.length };
  }
  return null;
}

async function parkPointer(cdp, geo, awayFrom) {
  const row = awayFrom === 0 ? 1 : 0;
  await cdp.call('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: geo.left + geo.cellW / 2,
    y: geo.top + (row + 0.5) * geo.cellH
  });
  await sleep(400);
}

async function pressCell(cdp, geo, row, col, width) {
  const x = geo.left + (col + width / 2) * geo.cellW;
  const y = geo.top + (row + 0.5) * geo.cellH;
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await sleep(1400);
  await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(2400);
}

const problems = [];
const SESSION = 'p250v-shell';
const ALLOWED_EXTENSIONS = new Set(['.pdf']);

await withElectron(
  {
    label: 'p250v-attack',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({
      HOME: home,
      GMUX_TMUX_SOCKET: socket,
      GMUX_PROBES: '1',
      GMUX_PATH_OPEN_RECORD: record
    }),
    ceilingMs: 14 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(60000);
    say(`app window at ${url}, pid ${handle.appPid()}`);
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
      });
      for (;;) {
        if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
        await sleep(50);
      }
      await drive(cdp, { projectPath: project, session: { agent: 'shell', name: SESSION } });
      await sleep(3000);

      const pane = paneIdOf(SESSION);
      if (pane === null) throw new Error('the session this run created has no pane');
      say(`the pane is ${pane}`);
      for (const [marker, tail] of ARMS.map((a) => [a[0], a[1]])) {
        tmux('send-keys', '-t', pane, `echo ${marker} ${tail}`, 'Enter');
        await sleep(600);
      }
      await sleep(2500);

      // The resting face: nothing decorated, nothing opened, nothing recorded.
      const resting = await cdpEval(cdp, TABS, 10000);
      if (JSON.stringify(resting) !== '[]') problems.push(`R a tab was open before any pointer moved: ${JSON.stringify(resting)}`);
      if (recordLines().length !== 0) problems.push('R the stub had a line before any pointer moved');

      for (const [marker, tail, token, wantTabs, wantRecords, what] of ARMS) {
        await closeAllTabs(cdp);
        const rows = await settledCapture(pane);
        const geo = await geometryNow(cdp, pane);
        const cell = geo === null ? null : cellOf(rows, marker, token);
        if (cell === null || cell.col === null) {
          problems.push(`${marker} the marked row for "${what}" was not in the pane, so nothing was pressed`);
          continue;
        }
        // eslint-disable-next-line no-control-regex
        if (/[^ -~]/.test(cell.text)) {
          problems.push(`${marker} the marked row is not pure ASCII, so its string index is not its column`);
          continue;
        }
        const endsTheRow = cell.col + cell.width === cell.text.replace(/\s+$/, '').length;
        const before = recordLines().length;
        await parkPointer(cdp, geo, cell.row);
        await pressCell(cdp, geo, cell.row, cell.col, cell.width);
        const tabs = await cdpEval(cdp, TABS, 10000);
        const after = recordLines();
        const newly = after.length - before;
        say(`${marker}: ${JSON.stringify({ what, cols: geo.cols, row: cell.row, col: cell.col, endsTheRow, tabs, newly })}`);
        if (JSON.stringify(tabs) !== JSON.stringify(wantTabs)) {
          problems.push(`${marker} ${what}: tabs ${JSON.stringify(tabs)} want ${JSON.stringify(wantTabs)}`);
        }
        if (newly !== wantRecords) {
          problems.push(`${marker} ${what}: the stub grew by ${newly}, want ${wantRecords}`);
        }
      }

      // ---- THE COUNT THAT MATTERS, ASSERTED AS A COUNT
      const lines = recordLines();
      const named = lines.map((l) => {
        try { return String(JSON.parse(l).open ?? ''); } catch { return ''; }
      });
      const extOf = (p) => {
        const n = p.slice(p.lastIndexOf('/') + 1).toLowerCase();
        const d = n.lastIndexOf('.');
        return d <= 0 ? '' : n.slice(d);
      };
      const notAllowed = named.filter((p) => !ALLOWED_EXTENSIONS.has(extOf(p)));
      const notInProject = named.filter((p) => !p.startsWith(`${realpathSync(project)}/`));
      say(`the stub holds ${lines.length} line(s); ${notAllowed.length} name a kind the allowlist does not name; ${notInProject.length} name a path outside the project`);
      if (notAllowed.length !== 0) problems.push(`${notAllowed.length} recorded path(s) name a kind the allowlist does not name`);
      if (notInProject.length !== 0) problems.push(`${notInProject.length} recorded path(s) are outside the scratch project`);
      if (lines.length !== 1) problems.push(`the stub holds ${lines.length} line(s), want exactly 1 (arm vN's absolute .pdf)`);
    } finally {
      try { cdp.close(); } catch { /* already closed */ }
    }
  }
);

const opAfter = operatorCount();
say(`the operator's own -L gmux sessions: ${opBefore} before, ${opAfter} after`);
say(`the Mac was handed ${recordLines().length} path(s), and opened none of them`);
if (problems.length === 0) {
  say('PASS: every attack was refused and every control opened.');
  process.exit(0);
}
for (const p of problems) say(`FINDING: ${p}`);
say(`FAILED: ${problems.length} finding(s).`);
process.exit(1);
