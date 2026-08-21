#!/usr/bin/env node
/**
 * `node build/probe-p129-agents.mjs`. Phase 129 item 1, driven in the REAL
 * Settings window.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PROVES
 * ---------------------------------------------------------------------------
 * The Agents tab used to draw this Mac's agents, then the configured agents,
 * then one block per machine, all on one scrolling page. With 32 machines that
 * page is unusable. Item 1 turns the machines into pages. This probe drives
 * three machine counts through the real Settings window and reads the document
 * after every press.
 *
 *   count  what must be true
 *   -----  ------------------------------------------------------------------
 *   0      no tab list at all, and the section's children are the same list
 *          that the unmodified tree drew, in the same order
 *   1      two tabs, reading This Mac and the machine's own label
 *   3      four tabs, in the order the machines file gives
 *
 * ---------------------------------------------------------------------------
 * THE BASELINE, and why it is a measurement rather than a memory
 * ---------------------------------------------------------------------------
 * `BASELINE_OUTLINE` below was READ from the unmodified tree by running this
 * file with `--capture-baseline` before item 1 was written. That is what makes
 * row 2 a comparison instead of an assertion. To take it again, check the
 * source out at the commit before the phase and run:
 *
 *     node build/probe-p129-agents.mjs --capture-baseline
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PROBE DOES NOT PROVE, and the report says so
 * ---------------------------------------------------------------------------
 *  - No machine is contacted and no agent scan is sent. The seeded rows are
 *    deliberately left unconfirmed, so every Rescan button is off and main
 *    refuses the machine before any connection is opened. The host is
 *    127.0.0.1 so no name is ever looked up.
 *  - Row 7 wanted the preload's own `machines.agents` wrapped and its call
 *    count read. Electron's contextBridge freezes the object it exposes, so
 *    the wrap may not take. The driver REPORTS whether it took, and the claim
 *    is carried by two further readings that do not depend on it: no ssh
 *    process started at all, and every machine page still says nothing has
 *    been asked.
 *  - It does not prove anything about how the pages look at 32 machines. The
 *    row scrolls sideways and that is read from the CSS, not driven here.
 *
 * ---------------------------------------------------------------------------
 * SAFETY, and none of it is optional
 * ---------------------------------------------------------------------------
 *  - Every launch uses an isolated `--user-data-dir` under the scratch
 *    directory. The operator's profile, his machines file and the installed
 *    app are never opened.
 *  - `-L gmux` appears once, in a read only session count taken before and
 *    after, which must match.
 *  - The launches carry their own tmux socket name and create no session.
 *  - Only pids this script recorded are killed. There is no `pkill` and no
 *    `kill-server`.
 *  - An `ssh` wrapper sits at the head of PATH. It runs nothing and writes one
 *    line per call, so a connection anybody opened is counted rather than
 *    trusted.
 *  - Every scratch file carries a `p129-` prefix.
 *
 * `P129_DEBUG=1` prints every launch's whole stdout, which is how a driver that
 * answered nothing is diagnosed rather than guessed at.
 *
 * Exit code 0 when every reading passes. 1 otherwise, with each failure named.
 */

import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratchRoot =
  process.env['TMPDIR'] !== undefined && process.env['TMPDIR'].length > 0
    ? process.env['TMPDIR']
    : '/tmp';
const scratch = join(scratchRoot, `p129-agents-${String(process.pid)}`);
const outDir = join(repoRoot, 'out');
const fakeBin = join(scratch, 'p129-bin');
const sshLog = join(scratch, 'p129-ssh.log');

const CAPTURE = process.argv.includes('--capture-baseline');

/** This probe's own tmux socket. It is never `gmux` and never `default`. */
const socketName = `gmux-p129-agents-${String(process.pid)}`;

/**
 * The children of `section[aria-label="Agents"]`, read from the tree before
 * item 1 was written, with no machine configured. Tag name and class list.
 */
const BASELINE_OUTLINE = ['h1.set-title', 'div.set-section-toolbar', 'div.set-card'];

const recordedPids = [];
const failures = [];
const rows = [];

const say = (text) => process.stdout.write(`[p129-agents] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p129-agents] FAIL: ${text}\n`);
};
const note = (n, what, verdict, detail) => {
  rows.push({ n, what, verdict, detail });
  process.stdout.write(`[p129-agents] ${String(n)}. ${what}: ${verdict}. ${detail}\n`);
};

function sh(file, args, options = {}) {
  const out = spawnSync(file, args, { encoding: 'utf8', timeout: 60_000, ...options });
  return { code: out.status ?? -1, stdout: out.stdout ?? '', stderr: out.stderr ?? '' };
}

function operatorSessions() {
  return sh('/bin/sh', [
    '-c',
    "tmux -L gmux list-sessions 2>/dev/null | wc -l | tr -d ' '"
  ]).stdout.trim();
}

const sessionsBefore = operatorSessions();

mkdirSync(fakeBin, { recursive: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(sshLog, '', 'utf8');

// An ssh that runs nothing and records that somebody tried. It sits at the
// head of PATH for every launch, so row 8 counts connections rather than
// trusting that none were opened.
writeFileSync(
  join(fakeBin, 'ssh'),
  `#!/bin/sh\nprintf '%s\\n' "$*" >> ${JSON.stringify(sshLog)}\nexit 1\n`,
  'utf8'
);
chmodSync(join(fakeBin, 'ssh'), 0o755);

function sshCalls() {
  try {
    return readFileSync(sshLog, 'utf8').split('\n').filter((l) => l.trim().length > 0);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// One profile per machine count, so the three cases cannot leak into each other
// ---------------------------------------------------------------------------

/**
 * A machine row with only the fields the file needs. Every row is left
 * UNCONFIRMED on purpose: the Rescan button is then off and main refuses the
 * machine before it opens anything, which is what makes rows 7 and 8 cheap.
 */
function machine(id, label, color) {
  return { id, label, color, host: '127.0.0.1' };
}

function seed(profile, machines) {
  const dir = join(profile, 'gmux', 'config');
  mkdirSync(dir, { recursive: true });
  if (machines.length === 0) {
    // No file at all is what a person with no machine has.
    rmSync(join(dir, 'machines.json'), { force: true });
    return;
  }
  writeFileSync(
    join(dir, 'machines.json'),
    `${JSON.stringify({ schema: 1, machines }, null, 2)}\n`,
    'utf8'
  );
}

function driveSettings({ shot, js, profile, timeoutMs = 120_000 }) {
  return new Promise((done) => {
    const child = spawn(
      'npx',
      ['electron', '.', `--user-data-dir=${profile}`, '-ApplePersistenceIgnoreState', 'YES'],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          PATH: `${fakeBin}:${process.env['PATH'] ?? ''}`,
          GMUX_SHOT: shot,
          GMUX_SHOT_SETTINGS: '1',
          GMUX_SHOT_SETTINGS_JS: js,
          GMUX_TMUX_SOCKET: socketName
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      }
    );
    recordedPids.push(child.pid);
    let out = '';
    child.stdout.on('data', (chunk) => {
      out += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      out += String(chunk);
    });
    const timer = setTimeout(() => {
      try {
        process.kill(child.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }, timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(timer);
      child.stdout.destroy();
      child.stderr.destroy();
      const line = out.split('\n').find((l) => l.includes('[gmux-shot] driver')) ?? '';
      const payload = line.slice(line.indexOf('driver') + 8).trim();
      let parsed = null;
      try {
        parsed = JSON.parse(payload.replace(/^→\s*/, ''));
      } catch {
        parsed = null;
      }
      if (process.env['P129_DEBUG'] === '1') process.stdout.write(out + '\n');
      done({ code, out, parsed });
    });
  });
}

/** A driver expression that runs in the Settings renderer and returns JSON. */
function driver(body) {
  return `(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const SECTION = 'section[aria-label="Agents"]';
    const section = () => document.querySelector(SECTION);
    const openAgents = async () => {
      const item = Array.from(document.querySelectorAll('button, [role="tab"], li, a'))
        .find((n) => (n.textContent || '').trim() === 'Agents');
      if (!item) return 'not-found';
      item.click();
      await wait(400);
      for (let i = 0; i < 40; i += 1) {
        if (section() !== null) return 'open';
        await wait(150);
      }
      return 'no-section';
    };
    /**
     * Wait for the tab row to be drawn.
     *
     * MEASURED. The machines are read from main after the window has loaded,
     * so the row appears some hundreds of milliseconds after the Agents tab
     * does. A fixed wait read an empty row on one run in three, which is a
     * flake in the probe rather than a defect in the product. This polls for
     * up to 6 s instead.
     */
    const untilTabs = async (n) => {
      for (let i = 0; i < 80; i += 1) {
        if (tabNodes().length >= n) return true;
        await wait(150);
      }
      return false;
    };
    const outline = () =>
      Array.from(document.querySelectorAll(SECTION + ' > *')).map((n) => {
        const cls = String(n.className || '').trim();
        return n.tagName.toLowerCase() + (cls === '' ? '' : '.' + cls.split(/\\s+/).join('.'));
      });
    const tabNodes = () =>
      Array.from(document.querySelectorAll(SECTION + ' [role="tablist"] [role="tab"]'));
    const tabs = () => tabNodes().map((n) => (n.textContent || '').trim());
    const has = (sel) => document.querySelector(SECTION + ' ' + sel) !== null;
    const count = (sel) => document.querySelectorAll(SECTION + ' ' + sel).length;
    const textOf = (sel) => {
      const el = document.querySelector(SECTION + ' ' + sel);
      return el === null ? null : (el.textContent || '').trim();
    };
    const allText = (sel) =>
      Array.from(document.querySelectorAll(SECTION + ' ' + sel)).map(
        (n) => (n.textContent || '').trim()
      );
    /** Try to count what the preload was asked. contextBridge may refuse. */
    const watchAgents = () => {
      window.__p129agentsCalls = 0;
      try {
        const m = window.gmux && window.gmux.machines;
        if (!m || typeof m.agents !== 'function') return 'no-surface';
        const real = m.agents.bind(m);
        Object.defineProperty(m, 'agents', {
          configurable: true,
          writable: true,
          value: function () {
            window.__p129agentsCalls += 1;
            return real.apply(null, arguments);
          }
        });
        return m.agents !== real ? 'wrapped' : 'refused';
      } catch (err) {
        return 'refused';
      }
    };
    const clickTab = async (label) => {
      const el = tabNodes().find((n) => (n.textContent || '').trim() === label);
      if (!el) return 'missing';
      el.click();
      await wait(500);
      return true;
    };
    /** A real key press on one tab, so the shipped handler is what answers. */
    const pressOn = async (label, key) => {
      const el = tabNodes().find((n) => (n.textContent || '').trim() === label);
      if (!el) return 'missing';
      el.focus();
      el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await wait(300);
      return true;
    };
    try {
      const result = await (async () => { ${body} })();
      return JSON.stringify(result);
    } catch (err) {
      return JSON.stringify({ error: String((err && err.message) || err) });
    }
  })()`;
}

const shotPath = (name) => join(outDir, `p129-${name}.png`);

function photographed(path) {
  return existsSync(path) && statSync(path).size > 0 ? statSync(path).size : 0;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

async function main() {
  const profileZero = join(scratch, 'p129-profile-0');
  const profileOne = join(scratch, 'p129-profile-1');
  const profileThree = join(scratch, 'p129-profile-3');

  // -- zero machines --------------------------------------------------------
  seed(profileZero, []);
  const zeroShot = shotPath('1-zero-machines');
  const zero = await driveSettings({
    profile: profileZero,
    shot: zeroShot,
    js: driver(`
      const opened = await openAgents();
      for (let i = 0; i < 40; i += 1) {
        if (count('.set-agent-row') > 0) break;
        await wait(150);
      }
      return {
        opened,
        outline: outline(),
        tablists: count('[role="tablist"]'),
        tabpanels: count('[role="tabpanel"]'),
        toolbar: has('.set-section-toolbar'),
        rescan: textOf('.set-rescan'),
        age: textOf('.set-scan-age'),
        agentRows: count('.set-agent-row'),
        machineCards: count('[data-machine-id]')
      };
    `)
  });
  const z = zero.parsed;

  if (CAPTURE) {
    process.stdout.write(
      `\nBASELINE_OUTLINE = ${JSON.stringify(z?.outline ?? null)}\n` +
        `tablists ${String(z?.tablists ?? 'n/a')}, tabpanels ${String(z?.tabpanels ?? 'n/a')}, ` +
        `agent rows ${String(z?.agentRows ?? 'n/a')}\n`
    );
    for (const pid of [...recordedPids].reverse()) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }
    sh('/bin/sh', ['-c', `tmux -L ${socketName} kill-server 2>/dev/null || true`]);
    say(`captured against ${profileZero}`);
    process.exit(0);
  }

  note(
    0,
    'the operator’s session count before anything started',
    'read',
    `${sessionsBefore} session(s) on -L gmux, read only`
  );

  const noTabs = z !== null && z.tablists === 0 && z.tabpanels === 0;
  if (!noTabs) {
    fail(
      `with no machine the Agents tab drew ${String(z?.tablists ?? 'n/a')} tab ` +
        `list(s) and ${String(z?.tabpanels ?? 'n/a')} tab panel(s). It must draw none.`
    );
  }
  note(
    1,
    'with zero machines there is no tab list at all',
    noTabs ? 'pass' : 'FAIL',
    `tab lists ${String(z?.tablists ?? 'n/a')}, tab panels ${String(z?.tabpanels ?? 'n/a')}`
  );

  const sameOutline =
    z !== null &&
    Array.isArray(z.outline) &&
    JSON.stringify(z.outline) === JSON.stringify(BASELINE_OUTLINE);
  if (!sameOutline) {
    fail(
      `with no machine the section's children read ${JSON.stringify(z?.outline ?? null)}. ` +
        `The unmodified tree drew ${JSON.stringify(BASELINE_OUTLINE)}.`
    );
  }
  note(
    2,
    'with zero machines the section is what the unmodified tree drew',
    sameOutline ? 'pass' : 'FAIL',
    `read ${JSON.stringify(z?.outline ?? null)}, baseline ${JSON.stringify(BASELINE_OUTLINE)}`
  );

  const localCardOk =
    z !== null &&
    z.toolbar === true &&
    typeof z.rescan === 'string' &&
    z.rescan.length > 0 &&
    typeof z.age === 'string' &&
    z.agentRows > 0;
  if (!localCardOk) {
    fail(`the local page lost the age line, the Re-scan button or the agents card. Driver: ${JSON.stringify(z)}`);
  }
  note(
    5,
    'the local page draws the age line, Re-scan and the agents card',
    localCardOk ? 'pass' : 'FAIL',
    `age ${JSON.stringify(z?.age ?? null)}, button ${JSON.stringify(z?.rescan ?? null)}, ` +
      `${String(z?.agentRows ?? 0)} agent row(s)`
  );

  // -- one machine ----------------------------------------------------------
  seed(profileOne, [machine('alpha', 'Alpha', 'blue')]);
  const oneShot = shotPath('2-one-machine');
  const one = await driveSettings({
    profile: profileOne,
    shot: oneShot,
    js: driver(`
      const opened = await openAgents();
      const drawn = await untilTabs(2);
      const watch = watchAgents();
      const before = tabs();
      const clicked = await clickTab('Alpha');
      await wait(400);
      return {
        opened,
        drawn,
        watch,
        tabs: before,
        clicked,
        selected: (document.querySelector(SECTION + ' [role="tab"][aria-selected="true"]') || {}).textContent,
        machineCards: allText('[data-machine-id]').length,
        machineIds: Array.from(document.querySelectorAll(SECTION + ' [data-machine-id]')).map(
          (n) => n.getAttribute('data-machine-id')
        ),
        toolbarOnMachinePage: has('.set-section-toolbar'),
        agentsCalls: window.__p129agentsCalls,
        askedLines: allText('.mach-agents-age')
      };
    `)
  });
  const o = one.parsed;
  const oneTabsOk =
    o !== null && Array.isArray(o.tabs) && JSON.stringify(o.tabs) === JSON.stringify(['This Mac', 'Alpha']);
  if (!oneTabsOk) {
    fail(`with one machine the tabs read ${JSON.stringify(o?.tabs ?? null)}, wanted ["This Mac","Alpha"].`);
  }
  note(
    3,
    'with one machine there are two tabs, This Mac and the machine',
    oneTabsOk ? 'pass' : 'FAIL',
    `tabs ${JSON.stringify(o?.tabs ?? null)}`
  );

  const switchedOk =
    o !== null &&
    o.clicked === true &&
    String(o.selected ?? '').trim() === 'Alpha' &&
    Array.isArray(o.machineIds) &&
    o.machineIds.length === 1 &&
    o.machineIds[0] === 'alpha' &&
    o.toolbarOnMachinePage === false;
  if (!switchedOk) {
    fail(`clicking the Alpha tab did not draw only that machine. Driver: ${JSON.stringify(o)}`);
  }
  note(
    6,
    'a machine tab draws that machine’s card and hides the local card',
    switchedOk ? 'pass' : 'FAIL',
    `selected ${JSON.stringify(String(o?.selected ?? '').trim())}, machine cards ` +
      `${JSON.stringify(o?.machineIds ?? null)}, local toolbar drawn ` +
      `${String(o?.toolbarOnMachinePage ?? 'n/a')}`
  );

  // -- three machines -------------------------------------------------------
  seed(profileThree, [
    machine('alpha', 'Alpha', 'blue'),
    machine('beta', 'Beta', 'red'),
    machine('mac-pro', 'Mac Pro', 'green')
  ]);
  const threeShot = shotPath('3-three-machines');
  const three = await driveSettings({
    profile: profileThree,
    shot: threeShot,
    js: driver(`
      const opened = await openAgents();
      const drawn = await untilTabs(4);
      const watch = watchAgents();
      const before = tabs();
      const visited = [];
      for (const label of ['Alpha', 'Beta', 'Mac Pro']) {
        const ok = await clickTab(label);
        visited.push([label, ok, Array.from(document.querySelectorAll(SECTION + ' [data-machine-id]')).map(
          (n) => n.getAttribute('data-machine-id')
        )]);
      }
      await clickTab('Alpha');
      await wait(300);
      return {
        opened,
        drawn,
        watch,
        tabs: before,
        visited,
        agentsCalls: window.__p129agentsCalls,
        askedLines: allText('.mach-agents-age'),
        rescanDisabled: Array.from(
          document.querySelectorAll(SECTION + ' [data-machines-action="rescan-agents"]')
        ).map((n) => n.disabled === true)
      };
    `)
  });
  const t = three.parsed;
  const threeTabsOk =
    t !== null &&
    Array.isArray(t.tabs) &&
    JSON.stringify(t.tabs) === JSON.stringify(['This Mac', 'Alpha', 'Beta', 'Mac Pro']);
  if (!threeTabsOk) {
    fail(
      `with three machines the tabs read ${JSON.stringify(t?.tabs ?? null)}, wanted ` +
        `["This Mac","Alpha","Beta","Mac Pro"] in machines file order.`
    );
  }
  note(
    4,
    'with three machines there are four tabs, in machines file order',
    threeTabsOk ? 'pass' : 'FAIL',
    `tabs ${JSON.stringify(t?.tabs ?? null)}`
  );

  const oneCardEach =
    t !== null &&
    Array.isArray(t.visited) &&
    t.visited.length === 3 &&
    t.visited.every(([label, ok, ids]) => ok === true && Array.isArray(ids) && ids.length === 1);
  if (!oneCardEach) {
    fail(`visiting each machine tab did not leave exactly one card each. Driver: ${JSON.stringify(t?.visited ?? null)}`);
  }
  note(
    6.1,
    'every machine tab draws exactly one machine card',
    oneCardEach ? 'pass' : 'FAIL',
    `visits ${JSON.stringify(t?.visited ?? null)}`
  );

  const callsOne = o?.agentsCalls ?? null;
  const callsThree = t?.agentsCalls ?? null;
  const wrapTook = o?.watch === 'wrapped' && t?.watch === 'wrapped';
  const askedNothing =
    Array.isArray(t?.askedLines) &&
    t.askedLines.length > 0 &&
    t.askedLines.every((line) => line.includes('has not asked this machine yet'));
  const noScan =
    (wrapTook ? callsOne === 0 && callsThree === 0 : true) && askedNothing && sshCalls().length === 0;
  if (!noScan) {
    fail(
      `switching pages sent something. Wrap ${JSON.stringify([o?.watch, t?.watch])}, calls ` +
        `${JSON.stringify([callsOne, callsThree])}, age lines ${JSON.stringify(t?.askedLines ?? null)}, ` +
        `ssh calls ${JSON.stringify(sshCalls())}.`
    );
  }
  note(
    7,
    'switching pages sends nothing',
    noScan ? 'pass' : 'FAIL',
    `the preload wrap ${wrapTook ? 'took, and the call count is ' + JSON.stringify([callsOne, callsThree]) : 'was refused by contextBridge, so the claim rests on the two readings beside it'}; ` +
      `every machine page still reads "has not asked this machine yet" ` +
      `(${String((t?.askedLines ?? []).length)} line(s))`
  );

  const sshOk = sshCalls().length === 0;
  if (!sshOk) fail(`an ssh was started: ${JSON.stringify(sshCalls())}`);
  note(
    8,
    'no ssh process started across the three launches',
    sshOk ? 'pass' : 'FAIL',
    `${String(sshCalls().length)} call(s) recorded by the wrapper at the head of PATH`
  );

  // -- the This Mac page with the tab row above it --------------------------
  //
  // Row 5 read the local page with no machine at all. This is the same page
  // with three machines beside it, which is the state the operator will see,
  // and it is the one the design is read from.
  const localShot = shotPath('4-this-mac-with-pages');
  const local = await driveSettings({
    profile: profileThree,
    shot: localShot,
    js: driver(`
      const opened = await openAgents();
      const drawn = await untilTabs(4);
      await clickTab('Beta');
      const back = await clickTab('This Mac');
      // The local scan runs on its own clock, so wait for a row rather than
      // for a fixed pause. Without this the page is photographed mid scan.
      for (let i = 0; i < 60; i += 1) {
        if (count('.set-agent-row') > 0) break;
        await wait(200);
      }
      await wait(300);
      return {
        opened,
        drawn,
        back,
        tabs: tabs(),
        selected: (document.querySelector(SECTION + ' [role="tab"][aria-selected="true"]') || {}).textContent,
        toolbar: has('.set-section-toolbar'),
        rescan: textOf('.set-rescan'),
        age: textOf('.set-scan-age'),
        agentRows: count('.set-agent-row'),
        machineCards: count('[data-machine-id]')
      };
    `)
  });
  const l = local.parsed;
  const backOk =
    l !== null &&
    String(l.selected ?? '').trim() === 'This Mac' &&
    l.toolbar === true &&
    l.agentRows > 0 &&
    l.machineCards === 0;
  if (!backOk) {
    fail(`coming back to This Mac did not restore the local page. Driver: ${JSON.stringify(l)}`);
  }
  note(
    5.1,
    'This Mac is one press away, and it is the page it always was',
    backOk ? 'pass' : 'FAIL',
    `selected ${JSON.stringify(String(l?.selected ?? '').trim())}, age ` +
      `${JSON.stringify(l?.age ?? null)}, ${String(l?.agentRows ?? 0)} agent row(s), ` +
      `${String(l?.machineCards ?? 'n/a')} machine card(s)`
  );

  const shots = [zeroShot, oneShot, threeShot, localShot];
  const sizes = shots.map((p) => photographed(p));
  const shotsOk = sizes.every((n) => n > 0);
  if (!shotsOk) fail(`a photograph is missing: ${JSON.stringify(shots.map((p, i) => [p, sizes[i]]))}`);
  note(
    9,
    'four photographs, one per machine count and one of This Mac',
    shotsOk ? 'pass' : 'FAIL',
    shots.map((p, i) => `${p} at ${String(sizes[i])} bytes`).join(', ')
  );
}

await main();

// ---------------------------------------------------------------------------
// The end
// ---------------------------------------------------------------------------

for (const pid of [...recordedPids].reverse()) {
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    /* already gone, which is the state we wanted */
  }
}

// The launches created a tmux server on THIS probe's own socket. It is named
// after this process and it holds no session, and leaving it running is a
// process this file started and did not stop. The two names that must never
// reach this line are refused by hand, because the whole product depends on
// the operator's server outliving anything a probe does.
if (socketName !== 'gmux' && socketName !== 'default' && socketName.startsWith('gmux-p129-')) {
  sh('/bin/sh', ['-c', `tmux -L ${socketName} kill-server 2>/dev/null || true`]);
  // `kill-server` ends the server and leaves the socket FILE behind, so
  // eighteen zero byte files named after eighteen dead runs of this probe
  // built up in the socket directory. The file is removed here, and the two
  // conditions above plus the exact name match below are what stop this line
  // reaching any file that is not the one this process made.
  const uid = typeof process.getuid === 'function' ? String(process.getuid()) : '';
  const sockPath = join(
    process.env['TMUX_TMPDIR'] ?? '/tmp',
    `tmux-${uid}`,
    socketName
  );
  if (uid !== '' && basename(sockPath) === socketName) {
    rmSync(sockPath, { force: true });
  }
} else {
  fail(`the probe's own socket name is ${JSON.stringify(socketName)}, which it refuses to touch.`);
}

const sessionsAfter = operatorSessions();
if (sessionsBefore !== sessionsAfter) {
  fail(
    `the operator's server held ${sessionsBefore} session(s) before this probe ` +
      `and ${sessionsAfter} after it.`
  );
}
note(
  10,
  'the operator’s session count did not move',
  sessionsBefore === sessionsAfter ? 'pass' : 'FAIL',
  `${sessionsBefore} before, ${sessionsAfter} after`
);

process.stdout.write('\n#     what                                                          verdict\n');
process.stdout.write('-'.repeat(92) + '\n');
for (const row of rows) {
  process.stdout.write(
    `${String(row.n).padEnd(6)}${String(row.what).padEnd(62)}${row.verdict}\n`
  );
}

say('NOT DRIVEN HERE: no machine was contacted, no agent scan was sent, and no');
say('agent was installed anywhere. What is proven is what the Agents tab DRAWS.');

try {
  rmSync(scratch, { recursive: true, force: true });
} catch {
  /* a scratch directory that will not go is not a result */
}

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${String(failures.length)}:\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. The Agents tab is pages. With no machine it is byte for byte the ' +
    'page it was, with one machine it has two pages and with three it has ' +
    'four, in the order the machines file gives. Switching pages sent ' +
    'nothing and started no connection.\n'
);

process.exit(0);
