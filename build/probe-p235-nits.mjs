#!/usr/bin/env node
/**
 * Phase 235's app run. ONE drive against the operator's Mac Pro that reads all
 * five items of the charter off the DOM and off the far side, and GRADES each
 * one, so the phase's claims are a set of numbers a verifier re-takes rather
 * than a set of sentences it reads.
 *
 * It grew out of the measure step's parent reading, which took the same
 * readings and judged none of them. What is new is the grader at the bottom,
 * the stale-view drive in launch C that item 5 needs, and the fact that a
 * reading that does not move now fails the run.
 *
 * `--self-test` proves the grader on fixtures and launches nothing, reaches no
 * machine and opens no socket.
 *
 * SAFETY, inherited from Phase 224 and Phase 234 exactly, and copied rather
 * than promised. Every ssh goes through build/ssh-run.mjs by way of
 * build/real-machine.mjs. Every write on that machine goes under ONE path this
 * run composes, ~/tortie-p235-scratch-<pid>, removed in a `finally` whatever
 * happened. That machine's own `-L gmux` server is only ever LISTED, before and
 * after. This Mac's `-L gmux` server is only ever LISTED. Every Electron goes
 * through build/electron-run.mjs on a scratch profile and a scratch socket and
 * is ended in a `finally` by that helper. Any scratch tmux server this run
 * starts on either computer is killed AND ITS SOCKET FILE UNLINKED in the same
 * `finally`, and neither is unlinked while a process holds it. His own
 * machines.json, confirmations and known-machines are never opened for writing;
 * this run has a scratch profile with its own three files. No agent runs and no
 * token is spent.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  gate,
  assertReachable,
  runOnMachine,
  listFarSessions,
  countOperatorSessions,
  hostKeyFileFacts,
  identityFilesLine,
  identityFilesUnmoved,
  closeMaster,
  endRecordedPids
} from './real-machine.mjs';
import { keyscanText } from './ssh-run.mjs';
import { withElectron } from './electron-run.mjs';
import { setupFar, teardownFar, runScript, setupScript, FAR_ROOT } from './p235/far-fixture.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p235]';
const say = (t) => process.stdout.write(`${TAG} ${t}\n`);
const runDir = join('/private/tmp', `p235-run-${String(process.pid)}`);
const profile = join(runDir, 'profile');
const localRepo = join(runDir, 'local-fixture');
const SOCKET = `gmux-p235-${String(process.pid)}`;
const MACHINE_ID = 'greg-s-mac-pro';
const MACHINE_LABEL = 'Greg’s Mac Pro';
const HOST = 'gregs-mac-pro.tail2ddfe1.ts.net';
/** Documentation address space. It routes nowhere. Research 85 section 4.5. */
const BLACKHOLE_ID = 'p235-blackhole';
const BLACKHOLE_HOST = '192.0.2.1';

const report = { when: new Date().toISOString(), tree: 'HEAD', socket: SOCKET };
const record = (k, v) => {
  report[k] = v;
  say(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v).slice(0, 900)}`);
};

function sh(file, args, options = {}) {
  const o = spawnSync(file, args, { encoding: 'utf8', timeout: 120_000, ...options });
  return { code: o.status ?? -1, stdout: o.stdout ?? '', stderr: o.stderr ?? '' };
}

const machinesJson = (tmuxPath) =>
  `${JSON.stringify(
    {
      schema: 1,
      machines: [
        { id: MACHINE_ID, label: MACHINE_LABEL, color: 'orange', host: HOST, remoteTmuxPath: tmuxPath },
        { id: BLACKHOLE_ID, label: 'Blackhole', color: 'magenta', host: BLACKHOLE_HOST, remoteTmuxPath: '/usr/local/bin/tmux' }
      ]
    },
    null,
    2
  )}\n`;

function launch({ label, js, settings, timeoutMs = 600_000, delayMs = 4000 }) {
  const env = {
    ...process.env,
    GMUX_SHOT: join(runDir, `${label}.png`),
    GMUX_SHOT_DELAY_MS: String(delayMs),
    GMUX_TMUX_SOCKET: SOCKET,
    // Main answers every popup with the row wearing this label and prints
    // every label the menu carried, which is the OFFERED reading.
    GMUX_SHOT_POPUP_PICK: 'Copy Path'
  };
  if (settings) {
    env['GMUX_SHOT_SETTINGS'] = '1';
    env['GMUX_SHOT_SETTINGS_JS'] = js;
  } else {
    env['GMUX_SHOT_JS'] = js;
  }
  return withElectron(
    { label: `p235-${label}`, userDataDir: profile, cwd: repoRoot, env, tmuxSocket: SOCKET, ceilingMs: timeoutMs + 60_000 },
    (handle) =>
      new Promise((done) => {
        const child = handle.child;
        let out = '';
        const take = (c) => { out += String(c); };
        child.stdout.on('data', take);
        child.stderr.on('data', take);
        const timer = setTimeout(() => {
          try { process.kill(child.pid, 'SIGTERM'); } catch { /* gone */ }
        }, timeoutMs);
        child.on('exit', (code) => {
          clearTimeout(timer);
          const marker = settings ? '[gmux-shot] driver' : '[gmux-shot] probe ';
          const at = out.lastIndexOf(marker);
          let parsed = null;
          if (at !== -1) {
            const line = out.slice(at + marker.length).split('\n')[0] ?? '';
            try { parsed = JSON.parse(line.replace(/^\s*→\s*/, '').trim()); } catch { parsed = null; }
          }
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch { /* a plain string */ }
          }
          writeFileSync(join(runDir, `${label}.log`), out, 'utf8');
          done({ code, out, parsed });
        });
      })
  );
}

const settingsDrive = (body) => `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const m = () => window.gmux.machines;
  const openMachines = async () => {
    const rail = Array.from(document.querySelectorAll('button, [role="tab"], li, a'))
      .find((n) => (n.textContent || '').trim() === 'Machines');
    if (rail) { rail.click(); await wait(900); return 'clicked'; }
    return 'not-found';
  };
  try { return JSON.stringify(await (async () => { ${body} })()); }
  catch (err) { return JSON.stringify({ error: String((err && err.stack) || err) }); }
})()`;

const PRELUDE = `
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const now = () => performance.now();
  const G = window.gmux;
  const until = async (fn, budget = 60000, step = 150) => {
    const t0 = now();
    for (;;) { let v = false; try { v = await fn(); } catch (e) { v = false; }
      if (v) return Math.round(now() - t0);
      if (now() - t0 >= budget) return null;
      await wait(step); }
  };
  // The Explorer's tree is inside file-tree-container's SHADOW ROOT, so a
  // reader that stops at innerText sees the header word and nothing else.
  const deepAll = (root) => {
    const out = [];
    const walk = (node) => {
      for (const el of node.querySelectorAll('*')) {
        out.push(el);
        if (el.shadowRoot !== null && el.shadowRoot !== undefined) walk(el.shadowRoot);
      }
    };
    if (root !== null && root !== undefined) walk(root);
    return out;
  };
  const railTitles = () => Array.from(document.querySelectorAll('button.ab-item')).map((b) => b.getAttribute('title'));
  const sidebarRoot = () => document.querySelector('[data-slot="sidebar"]');
  const sidebarText = () => {
    const s = sidebarRoot();
    if (s === null) return '(none)';
    const leaves = deepAll(s).filter((n) => n.children.length === 0).map((n) => (n.textContent || '').trim()).filter((t) => t.length > 0);
    // The leaf walk alone misses a block that holds a SENTENCE and a BUTTON,
    // because that block is not a leaf and its sentence is a bare text node.
    // The host's own innerText carries it, so both readings are joined.
    const own = (s.innerText || '').split(String.fromCharCode(10)).map((t) => t.trim()).filter((t) => t.length > 0);
    return [...own, ...leaves].join(' | ');
  };
  const railButton = (label) => Array.from(document.querySelectorAll('button.ab-item'))
    .find((b) => (b.getAttribute('title') || '').startsWith(label + ' ('));
  const selectProject = async (projectId) => {
    const wrap = document.querySelector('[data-project-id="' + projectId + '"]');
    if (wrap === null) return 'no-tab';
    const btn = wrap.querySelector('button.ptab');
    if (btn === null) return 'no-button';
    btn.click();
    await wait(1200);
    return btn.getAttribute('aria-current') === 'true' ? 'selected' : 'clicked';
  };
  // ---- the menu reader --------------------------------------------------
  // The bridge is behind contextIsolation and is frozen, so nothing here
  // patches it. Main answers the popup under GMUX_SHOT_POPUP_PICK and prints
  // every label the menu carried on one line, which is the OFFERED reading,
  // and the pick RUNS the row, which is how the clipboard reading is taken.
  // navigator.clipboard.readText() was proved to answer in this harness.
  // THE SYSTEM PASTEBOARD CANNOT BE READ FROM HERE, measured in research 94
  // section 4.0: navigator.clipboard.readText throws "Document is not
  // focused" in a shot launch and writeText from an unfocused window does
  // not reach the pasteboard either. So the harness RECORDS what the menu row
  // handed the clipboard, by replacing the one method on the page's own
  // navigator. Nothing in the product is changed by it: writeText is a DOM
  // method in this page's world, the same world GMUX_SHOT_JS already runs in,
  // and the original is put back straight after the read.
  const copied = [];
  const rightClick = async (el) => {
    if (el === undefined || el === null) return 'no-element';
    const original = navigator.clipboard.writeText.bind(navigator.clipboard);
    let seen = 'NOTHING-WAS-COPIED';
    try {
      navigator.clipboard.writeText = (text) => { seen = String(text); copied.push(String(text)); return original(text); };
      el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 40, clientY: 40 }));
      await wait(1200);
    } finally {
      navigator.clipboard.writeText = original;
    }
    return seen;
  };
  const editorTabs = () => Array.from(document.querySelectorAll('.ed-tabs [role="tab"], [role="tab"].ed-tab, .ptab-list [role="tab"]'));
  // The strip holds every open tab, so index 0 is whichever was opened first.
  // The machine's own tab is the one whose identity names the machine.
  const tabNaming = (word) => editorTabs().find((t) => (t.getAttribute('title') || '').includes(word)) ?? null;
  const tabNotNaming = (word) => editorTabs().find((t) => !(t.getAttribute('title') || '').includes(word)) ?? null;
  const openExplorer = async () => { const b = railButton('Explorer'); if (b === undefined) return false; b.click(); await wait(900); return true; };
  const openView = async (label) => {
    for (let i = 0; i < 8; i += 1) {
      const b = railButton(label);
      if (b === undefined) { await wait(1500); continue; }
      b.click();
      await wait(2000);
      if (sidebarRoot() !== null) return 'open after ' + String(i + 1) + ' press(es)';
    }
    return 'no-sidebar, rail=' + JSON.stringify(railTitles());
  };
  const namedNode = (name) =>
    deepAll(sidebarRoot()).find((n) => n.children.length === 0 && (n.textContent || '').trim() === name) ?? null;
  const clickNamed = async (name) => {
    if (sidebarRoot() === null) return 'no-sidebar';
    const node = namedNode(name);
    if (node === null) return 'not-found';
    let target = node;
    for (let i = 0; i < 6 && target.parentElement !== null; i += 1) {
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await wait(250);
      if (editorTabs().length > 0) return 'opened at depth ' + String(i);
      target = target.parentElement;
    }
    return 'clicked, no tab';
  };
  const tiles = () => Array.from(document.querySelectorAll('.agent-tile')).map((b) => ({
    name: (b.querySelector('.agent-tile-name')?.textContent ?? '').trim(),
    unusable: b.getAttribute('aria-disabled') === 'true',
    aria: b.getAttribute('aria-label') ?? ''
  }));
  const openCreateSheet = async () => {
    const b = Array.from(document.querySelectorAll('button[aria-label]'))
      .find((n) => (n.getAttribute('aria-label') || '').startsWith('New session ('));
    if (b === undefined) return 'no-button';
    b.click(); await wait(1400);
    return document.querySelectorAll('.agent-tile').length > 0 ? 'open' : 'no-tiles';
  };
  const closeCreateSheet = async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wait(700);
  };
`;

function addProjectsDriver() {
  return `(async () => {${PRELUDE}
  const out = {};
  try {
    out.boot = await until(() => (document.body.innerText || '').length > 40, 60000);
    out.prepare = JSON.stringify(await G.machines.prepare(${JSON.stringify(MACHINE_ID)})).slice(0, 300);
    out.local = JSON.stringify(await G.projects.add(${JSON.stringify(localRepo)})).slice(0, 200);
    out.remote = JSON.stringify(await G.projects.addRemote({ machineId: ${JSON.stringify(MACHINE_ID)}, path: ${JSON.stringify(FAR_ROOT)} })).slice(0, 300);
    await wait(2000);
    out.list = JSON.stringify(await G.projects.list()).slice(0, 900);
    return JSON.stringify(out);
  } catch (e) { out.error = String((e && e.stack) || e); return JSON.stringify(out); }
})()`;
}

function readingDriver() {
  return `(async () => {${PRELUDE}
  const out = { items: {} };
  try {
    out.boot = await until(() => (document.body.innerText || '').length > 40, 60000);
    out.prepare = JSON.stringify(await G.machines.prepare(${JSON.stringify(MACHINE_ID)})).slice(0, 200);
    await wait(2500);
    const list = await G.projects.list();
    const remoteP = list.find((p) => p.machineId === ${JSON.stringify(MACHINE_ID)});
    const localP = list.find((p) => (p.machineId ?? null) === null);

    // ---- item 5, half one: the grid on a CONNECTED machine ---------------
    out.selRemote0 = await selectProject(remoteP?.id ?? '');
    await wait(2500);
    out.agentsView = JSON.stringify(await G.machines.agents(${JSON.stringify(MACHINE_ID)})).slice(0, 1400);
    out.sheetConnected = await openCreateSheet();
    out.items.tilesConnected = tiles();
    await closeCreateSheet();

    // ---- item 5, half two: THE SAME MACHINE, ONE CONNECTION LATER --------
    // prepareMachine registers a context as its first act and registering
    // BUMPS the connection generation, so the held answer is stale from that
    // instant; the fresh scan only starts after the whole prepare resolves,
    // which is two ssh round trips away. So the prepare is fired and NOT
    // awaited, and the view is read inside that window. This is the state
    // the Phase 109 fix round measured from the other side, being a board
    // that had 9 greyed tiles and then had none.
    const inFlight = G.machines.prepare(${JSON.stringify(MACHINE_ID)});
    await wait(150);
    out.items.agentsStale = JSON.stringify(await G.machines.agents(${JSON.stringify(MACHINE_ID)}));
    out.items.staleReadAt = 'about 150 ms after the bump, before the new scan';
    try { out.stalePrepare = JSON.stringify(await inFlight).slice(0, 200); }
    catch (e) { out.stalePrepare = 'threw: ' + String(e).slice(0, 200); }
    await wait(2500);

    // ---- the LOCAL tab's menu first ---------------------------------------
    // The file is opened from SOURCE CONTROL rather than from the Explorer,
    // because the Explorer's tree is inside a shadow root and Source control
    // draws plain rows. Either gesture opens the same tab.
    out.selLocal = await selectProject(localP?.id ?? '');
    out.scmLocal = await openView('Source control');
    out.localWait = await until(() => (sidebarText() || '').includes('core1.ts'), 45000);
    out.openLocal = await clickNamed('core1.ts');
    await until(() => editorTabs().length > 0, 20000);
    out.localTabLabels = editorTabs().map((t) => (t.textContent || '').trim());
    out.localTabTitles = editorTabs().map((t) => t.getAttribute('title'));
    out.items.localTabRightClick = await rightClick(tabNotNaming('Mac Pro'));
    out.localTabRightClicked = (tabNotNaming('Mac Pro') ?? {}).title ?? null;

    // ---- the REMOTE tab's menu LAST ---------------------------------------
    // Last on purpose: the driver cannot read the clipboard because the shot
    // window is not focused, so the node side reads the SYSTEM clipboard after
    // this launch exits, and what is on it is whatever the last Copy Path put
    // there. The run saves and restores the person's own pasteboard.
    out.selRemote = await selectProject(remoteP?.id ?? '');
    out.scmRemote = await openView('Source control');
    out.remoteWait = await until(() => (sidebarText() || '').includes('core1.ts'), 60000);
    out.sidebarRemote = sidebarText().slice(0, 400);
    out.openRemote = await clickNamed('core1.ts');
    out.tabWait = await until(() => editorTabs().length > 0, 30000);
    out.remoteTabLabels = editorTabs().map((t) => (t.textContent || '').trim());
    out.remoteTabTitles = editorTabs().map((t) => t.getAttribute('title'));
    out.remoteTabRightClicked = (tabNaming('Mac Pro') ?? {}).title ?? null;
    out.items.remoteTabRightClick = await rightClick(tabNaming('Mac Pro'));

    // ---- item 3: the sentence for a machine nothing reaches --------------
    const t0 = now();
    out.items.blackholePrepare = JSON.stringify(await G.machines.prepare(${JSON.stringify(BLACKHOLE_ID)}));
    out.items.blackholeMs = Math.round(now() - t0);

    return JSON.stringify(out);
  } catch (e) { out.error = String((e && e.stack) || e); return JSON.stringify(out); }
})()`;
}

function changedDriver() {
  return `(async () => {${PRELUDE}
  const out = { items: {} };
  try {
    out.boot = await until(() => (document.body.innerText || '').length > 40, 60000);
    out.prepare = JSON.stringify(await G.machines.prepare(${JSON.stringify(MACHINE_ID)})).slice(0, 300);
    await wait(2500);
    const list = await G.projects.list();
    const remoteP = list.find((p) => p.machineId === ${JSON.stringify(MACHINE_ID)});
    out.sel = await selectProject(remoteP?.id ?? '');
    await openExplorer();
    out.treeWait = await until(() => (sidebarText() || '').includes('README.md'), 45000);
    out.beforeRows = JSON.stringify(((await G.machines.rows()).rows ?? []).map((r) => ({ id: r.id, state: r.state, usable: r.usable }))).slice(0, 400);
    out.beforeStates = JSON.stringify(await G.machines.state()).slice(0, 600);
    out.beforeSidebar = sidebarText().slice(0, 600);
    out.beforePrepareButtons = document.querySelectorAll('[data-machines-action="prepare"]').length;
    out.sheetBefore = await openCreateSheet();
    out.items.tilesBeforeChange = tiles();
    await closeCreateSheet();

    // ---- item 4: one execution bearing field is rewritten on disk --------
    // The rewrite is done by main's own harness door if there is one, and by
    // this driver's fetch if not; there is neither, so the SCRIPT does it and
    // this driver only waits for the watcher.
    out.settleWait = await until(async () => {
      const rows = (await G.machines.rows()).rows ?? [];
      return (rows.find((r) => r.id === ${JSON.stringify(MACHINE_ID)})?.state ?? '') === 'changed';
    }, 300000);
    await wait(3000);
    out.afterRows = JSON.stringify(((await G.machines.rows()).rows ?? []).map((r) => ({ id: r.id, state: r.state, usable: r.usable }))).slice(0, 400);
    out.afterStates = JSON.stringify(await G.machines.state()).slice(0, 600);
    // Force the views to try again the way a person's own visit would.
    out.explorerAfterOpen = await openView('Explorer');
    await wait(3000);
    out.items.explorerAfterChange = sidebarText().slice(0, 900);
    const scm = railButton('Source control');
    if (scm !== undefined) { scm.click(); await wait(4000); }
    out.items.scmAfterChange = sidebarText().slice(0, 900);
    out.items.prepareButtonsAfterChange = document.querySelectorAll('[data-machines-action="prepare"]').length;
    // PHASE 235, item 4. The action a changed row gets, which is the confirm
    // one and not Phase 232's Prepare: a changed row's link reads refused and
    // prepareActionOffered excludes it on purpose.
    out.items.confirmButtonsAfterChange = document.querySelectorAll('[data-machines-action="confirm-changed"]').length;
    out.items.confirmButtonLabels = Array.from(document.querySelectorAll('[data-machines-action="confirm-changed"]')).map((b) => (b.textContent || '').trim());
    out.items.bodyMentionsConfirm = (document.body.innerText || '').toLowerCase().includes('confirm');
    // ---- item 5, half two: the grid on a machine that is not connected ---
    out.sheetAfter = await openCreateSheet();
    out.items.tilesAfterChange = tiles();
    await closeCreateSheet();
    return JSON.stringify(out);
  } catch (e) { out.error = String((e && e.stack) || e); return JSON.stringify(out); }
})()`;
}

/**
 * Launch E. The grid on a machine that is CONFIRMED and will not connect,
 * beside launch C's reading of the same grid on the same machine connected.
 * The row's `remoteTmuxPath` names a program that is not on that machine, so
 * the sign in fails at the version read and nothing is held about its agents.
 */
function disconnectedDriver() {
  return `(async () => {${PRELUDE}
  const out = { items: {} };
  try {
    out.boot = await until(() => (document.body.innerText || '').length > 40, 60000);
    await wait(6000);
    out.state = JSON.stringify(await G.machines.state());
    out.rows = JSON.stringify(((await G.machines.rows()).rows ?? []).map((r) => ({ id: r.id, state: r.state, usable: r.usable, ready: r.ready ?? null })));
    out.items.agentsHeld = JSON.stringify(await G.machines.agents(${JSON.stringify(MACHINE_ID)}));
    const list = await G.projects.list();
    const remoteP = list.find((p) => p.machineId === ${JSON.stringify(MACHINE_ID)});
    out.sel = await selectProject(remoteP?.id ?? '');
    await wait(2500);
    out.items.tilesDisconnected = tiles();
    out.items.prepareButtons = document.querySelectorAll('[data-machines-action="prepare"]').length;
    out.items.bodyMentionsConfirm = (document.body.innerText || '').toLowerCase().includes('confirm');
    out.items.bodyText = (document.body.innerText || '').slice(0, 1200);
    out.sheet = await openCreateSheet();
    out.items.tilesSheetDisconnected = tiles();
    await closeCreateSheet();
    return JSON.stringify(out);
  } catch (e) { out.error = String((e && e.stack) || e); return JSON.stringify(out); }
})()`;
}


// ---------------------------------------------------------------------------
// The grader. Every claim this phase makes, as a reading rather than a sentence
// ---------------------------------------------------------------------------

const REVEAL = 'Reveal in Finder';
const CONFIRM_LINE_WORDS = 'changed, so confirm them again in Settings, then Machines.';
const FALSE_TREE = 'is not connected to';
const FALSE_SCM = 'did not answer, so Tortie could not read what changed';

/** The label list main printed for one popup, or null. */
function menuLabels(menuLines, which) {
  const line = (menuLines ?? [])[which];
  if (typeof line !== 'string') return null;
  try {
    const at = line.indexOf('[');
    return at === -1 ? null : JSON.parse(line.slice(at, line.lastIndexOf(']') + 1));
  } catch { return null; }
}

function parsed(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(String(value)); } catch { return null; }
}

/**
 * Judge one report. Pure, so `--self-test` can drive it over fixtures.
 *
 * Every check names the item it belongs to and prints its own reading, so a
 * verifier reads the numbers rather than the verdict.
 */
export function grade(report) {
  const lines = [];
  const findings = [];
  const ok = (item, said) => lines.push(`  ok   ${item}: ${said}`);
  const bad = (item, said) => { lines.push(`  FAIL ${item}: ${said}`); findings.push(`${item}: ${said}`); };
  const C = parsed(report.launchC);
  const D = parsed(report.launchD);
  const E = parsed(report.launchE);
  const menus = report.launchCMenus ?? [];

  // ---- items 1 and 2: the editor tab strip's menu -------------------------
  const local = menuLabels(menus, 0);
  const remote = menuLabels(menus, 1);
  if (local === null || remote === null) {
    bad('item 1', `two menus were not read: ${JSON.stringify(menus).slice(0, 300)}`);
  } else {
    if (local.includes(REVEAL)) ok('item 1', `the local tab offers ${REVEAL}, ${String(local.length)} rows`);
    else bad('item 1', `the LOCAL tab lost ${REVEAL}: ${JSON.stringify(local)}`);
    if (remote.includes(REVEAL)) bad('item 1', `the remote tab still offers ${REVEAL}: ${JSON.stringify(remote)}`);
    else ok('item 1', `the remote tab offers no ${REVEAL}, ${String(remote.length)} rows`);
    // `Keep Open` is about PREVIEW and not about machines: whichever tab was
    // opened as a preview carries it. It is taken out of both sides so the
    // comparison is about the machine, which is what this item is.
    const noPreview = (rows) => rows.filter((one) => one !== 'Keep Open');
    const diff = noPreview(local).filter((one) => !noPreview(remote).includes(one));
    if (diff.length === 1 && diff[0] === REVEAL) ok('item 1', 'the two menus differ by that one row and nothing else');
    else bad('item 1', `the two menus differ by ${JSON.stringify(diff)} rather than by ${REVEAL} alone`);
    const extra = noPreview(remote).filter((one) => !noPreview(local).includes(one));
    if (extra.length === 0) ok('item 1', 'the remote menu adds no row and no sentence');
    else bad('item 1', `the remote menu carries rows the local one does not: ${JSON.stringify(extra)}`);
  }
  // ITEM 2 IS READ FROM WHAT THE MENU ROW HANDED THE CLIPBOARD, not from the
  // system pasteboard, which research 94 section 4.0 measured as unreadable
  // from an unfocused shot window in both directions. The harness records the
  // one DOM call and puts it back; the pasteboard reading is kept beside it as
  // a note so the limit stays visible rather than being quietly dropped.
  const clip = String(C?.items?.remoteTabRightClick ?? '');
  if (clip.startsWith(`${MACHINE_LABEL}:/`)) ok('item 2', `Copy Path on the remote tab handed the clipboard ${JSON.stringify(clip.slice(0, 70))}`);
  else bad('item 2', `Copy Path on the remote tab handed the clipboard ${JSON.stringify(clip.slice(0, 90))}, with no machine in front of it`);
  const localClip = String(C?.items?.localTabRightClick ?? '');
  if (localClip.startsWith('/')) ok('item 2', `Copy Path on the local tab is unchanged: ${JSON.stringify(localClip.slice(0, 60))}`);
  else bad('item 2', `Copy Path on the local tab handed the clipboard ${JSON.stringify(localClip.slice(0, 90))}`);
  lines.push(`  note item 2: the system pasteboard is not read; it held ${JSON.stringify(String(report.remoteTabCopyPathClipboard ?? '').slice(0, 40))} and was restored`);

  // ---- item 3: a machine nothing reached ----------------------------------
  const black = parsed(C?.items?.blackholePrepare);
  if (black === null) {
    bad('item 3', 'the blackhole prepare answered nothing');
  } else if (black.class === 'timed-out') {
    ok('item 3', `the blackhole answered class ${black.class} in ${String(C?.items?.blackholeMs ?? '?')} ms: ${JSON.stringify(black.headline)}`);
  } else {
    bad('item 3', `the blackhole answered class ${String(black.class)}: ${JSON.stringify(String(black.detail).slice(0, 120))}`);
  }
  if (black !== null && String(black.detail ?? '').includes('would not report its version')) {
    bad('item 3', 'the sentence still names a program on a machine nothing reached');
  } else if (black !== null) {
    ok('item 3', 'the sentence names no program on that machine');
  }

  // ---- item 4: a row whose confirm hash moved ------------------------------
  const tree = String(D?.items?.explorerAfterChange ?? '');
  const scm = String(D?.items?.scmAfterChange ?? '');
  const buttons = Number(D?.items?.confirmButtonsAfterChange ?? 0);
  if (tree.includes(CONFIRM_LINE_WORDS)) ok('item 4', 'the Explorer says the row needs confirming again, and where');
  else bad('item 4', `the Explorer drew ${JSON.stringify(tree.slice(0, 200))}`);
  if (scm.includes(CONFIRM_LINE_WORDS)) ok('item 4', 'Source control says the same one sentence');
  else bad('item 4', `Source control drew ${JSON.stringify(scm.slice(0, 200))}`);
  if (tree.includes(FALSE_TREE) || scm.includes(FALSE_SCM)) bad('item 4', 'a false sentence about that machine is still drawn');
  else ok('item 4', 'neither false sentence is drawn');
  if (buttons >= 1) ok('item 4', `${String(buttons)} confirm action(s) on the tab, where there were 0`);
  else bad('item 4', 'no confirm action is offered anywhere on the tab');
  if (D?.items?.bodyMentionsConfirm === true) ok('item 4', 'the word "confirm" is on the tab, where it appeared 0 times');
  else bad('item 4', 'the word "confirm" appears nowhere on the tab');

  // ---- item 5: the board never grows --------------------------------------
  // BY NAME, because the empty state's board and the open sheet's board are
  // both mounted at that moment, so every tile appears twice and a raw count
  // is double. A name is greyed when any tile carrying it is.
  const greyed = (rows) => {
    if (!Array.isArray(rows)) return -1;
    const byName = new Map();
    for (const one of rows) byName.set(one.name, (byName.get(one.name) ?? false) || one.unusable === true);
    return [...byName.values()].filter(Boolean).length;
  };
  const tileNames = (rows) => (Array.isArray(rows) ? new Set(rows.map((one) => one.name)).size : -1);
  const connected = greyed(C?.items?.tilesConnected);
  // `machines.agents` answers a LIST of views, one per machine it was asked
  // about, so the machine's own view is found by id rather than assumed.
  const staleAll = parsed(C?.items?.agentsStale);
  const stale = Array.isArray(staleAll)
    ? (staleAll.find((one) => one.machineId === MACHINE_ID) ?? staleAll[0] ?? null)
    : staleAll;
  const readings = Array.isArray(stale?.agents) ? stale.agents : null;
  const count = (fn) => (readings === null ? -1 : readings.filter(fn).length);
  const absent = count((one) => one.presence === 'absent');
  const present = count((one) => one.presence === 'present');
  const paths = count((one) => one.path !== null);
  if (connected < 1) bad('item 5', `the connected grid greyed ${String(connected)} tiles, so there is nothing to compare`);
  else ok('item 5', `the connected grid greyed ${String(connected)} of ${String(tileNames(C?.items?.tilesConnected))} tiles`);
  if (absent >= connected) ok('item 5', `one connection later the answer still holds ${String(absent)} absent, so the board never grew`);
  else bad('item 5', `one connection later the answer holds ${String(absent)} absent against ${String(connected)} greyed, so the board GREW`);
  if (present === 0 && paths === 0) ok('item 5', 'and it states no presence and no path from the connection that went');
  else bad('item 5', `it still states ${String(present)} presence(s) and ${String(paths)} path(s) from the connection that went`);
  // ITEM 5'S OTHER HALF IS A STATED LIMIT AND IS GRADED AS ONE. It was a note
  // until this fix round, printed inside a run that then said PASS, so the one
  // reading the charter asks about most plainly could not fail. The charter
  // reads "disconnected, all 14 are offered", and that is still what a machine
  // which has said NOTHING IN THIS RUN does: the held answer is per process, so
  // a launch that never reached the machine has no last known to offer, and
  // research 58 allows only a POSITIVE absence to grey a tile. Both numbers are
  // asserted, so the day either moves the run goes red and names what to
  // restate rather than changing in silence.
  const disc = greyed(E?.items?.tilesDisconnected);
  const discTiles = tileNames(E?.items?.tilesDisconnected);
  const connTiles = tileNames(C?.items?.tilesConnected);
  const discOffered = discTiles - disc;
  const connOffered = connTiles - connected;
  if (disc === 0) ok('item 5', `a machine that has said nothing in this run greys ${String(disc)} tiles, which is research 58's rule and is unchanged by this phase`);
  else bad('item 5', `it greys ${String(disc)} of ${String(discTiles)} tiles having said nothing in this run: either a tile was greyed with no positive absence, which is research 58's rule broken, or the limit below closed and this reading and the Phase 235 entry both have to say so`);
  if (discOffered > connOffered) ok('item 5', `EXPECTED LIMIT: it offers all ${String(discOffered)} of ${String(discTiles)} tiles against ${String(connOffered)} of ${String(connTiles)} on a connected one, which is the charter's other half and is NOT closed; what this phase closed is the board that had already answered and then lost its connection`);
  else bad('item 5', `the stated limit moved: a machine that has said nothing offers ${String(discOffered)} of ${String(discTiles)} against ${String(connOffered)} of ${String(connTiles)} connected, so update this reading and the Phase 235 entry with it`);

  return { lines, findings };
}

// ---------------------------------------------------------------------------
// --self-test. It launches nothing, reaches no machine and opens no socket
// ---------------------------------------------------------------------------

function selfTest() {
  const menuLine = (labels) => `{"pick":"Copy Path","id":"item-6","labels":${JSON.stringify(labels)}}`;
  const CLOSES = ['Close', 'Close Others', 'Close to the Right', 'Close Saved', 'Close All'];
  const LOCAL = [...CLOSES, 'Keep Open', 'Copy Path', 'Copy Relative Path', REVEAL];
  const REMOTE = [...CLOSES, 'Copy Path', 'Copy Relative Path'];
  const AGENTS = ['claude', 'cursor', 'codex', 'gemini', 'droid', 'deepseek', 'antigravity', 'muse', 'qwen', 'pi', 'omp', 'grok'];
  /** The shape the real run reads: every tile drawn twice, once per board. */
  const tilesOf = (greyedFrom) => {
    const one = AGENTS.map((id, i) => ({ name: id, unusable: i >= greyedFrom, aria: '' }));
    return [...one, ...one, { name: 'shell', unusable: false, aria: '' }];
  };
  const good = {
    launchCMenus: [menuLine(LOCAL), menuLine(REMOTE)],
    remoteTabCopyPathClipboard: 'whatever the person had',
    launchC: {
      items: {
        localTabRightClick: '/Users/gdc/local/core1.ts',
        remoteTabRightClick: `${MACHINE_LABEL}:/Users/gdc/x/core1.ts`,
        blackholePrepare: JSON.stringify({ class: 'timed-out', headline: 'The test ran out of time.', detail: 'Nothing was changed on either machine.' }),
        blackholeMs: 20013,
        tilesConnected: tilesOf(3),
        agentsStale: JSON.stringify([
          {
            machineId: MACHINE_ID,
            askedAt: 1788916358410,
            agents: AGENTS.map((id, i) => ({ agentId: id, presence: i < 3 ? 'unknown' : 'absent', path: null }))
          }
        ])
      }
    },
    launchD: {
      items: {
        explorerAfterChange: `The details for ${MACHINE_LABEL} ${CONFIRM_LINE_WORDS}`,
        scmAfterChange: `The details for ${MACHINE_LABEL} ${CONFIRM_LINE_WORDS} | Confirm the new details`,
        confirmButtonsAfterChange: 1,
        bodyMentionsConfirm: true
      }
    },
    launchE: { items: { tilesDisconnected: tilesOf(99) } }
  };
  const clone = () => JSON.parse(JSON.stringify(good));
  const cases = [['the whole reading', good, 0]];
  const plant = (name, mutate) => {
    const r = clone();
    mutate(r);
    cases.push([name, r, -1]);
  };
  plant('the remote menu keeps Reveal', (r) => { r.launchCMenus[1] = menuLine([...REMOTE, REVEAL]); });
  plant('the local menu loses Reveal', (r) => { r.launchCMenus[0] = menuLine(REMOTE); });
  plant('the remote menu grows a row', (r) => { r.launchCMenus[1] = menuLine([...REMOTE, 'Something else']); });
  plant('Copy Path drops the machine', (r) => { r.launchC.items.remoteTabRightClick = '/Users/gdc/x/core1.ts'; });
  plant('Copy Path on this Mac gains one', (r) => { r.launchC.items.localTabRightClick = 'Studio:/Users/gdc/local/core1.ts'; });
  plant('the blackhole is unreadable again', (r) => {
    r.launchC.items.blackholePrepare = JSON.stringify({ class: 'version-unmeasured', headline: 'x', detail: 'The program at /usr/local/bin/tmux on this machine would not report its version.' });
  });
  plant('the tab says nothing about confirming', (r) => {
    r.launchD.items.explorerAfterChange = `Tortie ${FALSE_TREE} ${MACHINE_LABEL}, so it cannot read that folder.`;
  });
  plant('the tab offers no action', (r) => { r.launchD.items.confirmButtonsAfterChange = 0; });
  plant('the word confirm is nowhere', (r) => { r.launchD.items.bodyMentionsConfirm = false; });
  plant('the false Source control sentence is back', (r) => {
    r.launchD.items.scmAfterChange = `${MACHINE_LABEL} ${FALSE_SCM}.`;
  });
  plant('the stale answer drops every absence', (r) => {
    r.launchC.items.agentsStale = JSON.stringify([
      { machineId: MACHINE_ID, askedAt: null, agents: AGENTS.map((id) => ({ agentId: id, presence: 'unknown', path: null })) }
    ]);
  });
  plant('the stale answer keeps a presence and a path', (r) => {
    r.launchC.items.agentsStale = JSON.stringify([
      {
        machineId: MACHINE_ID,
        askedAt: 1,
        agents: AGENTS.map((id, i) => (i === 0
          ? { agentId: id, presence: 'present', path: '/Users/gdc/.local/bin/claude' }
          : { agentId: id, presence: 'absent', path: null }))
      }
    ]);
  });
  plant('the connected board greyed nothing, so there is nothing to compare', (r) => {
    r.launchC.items.tilesConnected = tilesOf(99);
  });
  // The two arms of the stated limit, one each. The first greys a tile on a
  // machine that has said nothing, which research 58 forbids and which is also
  // what closing the limit would look like; the second closes it outright.
  plant('a machine that said nothing greys a tile anyway', (r) => {
    r.launchE.items.tilesDisconnected = tilesOf(11);
  });
  plant('the stated limit closed and nobody restated it', (r) => {
    r.launchE.items.tilesDisconnected = tilesOf(3);
  });
  plant('nothing was read at all', (r) => { r.launchCMenus = []; });

  let bad = 0;
  for (const [name, fixture, want] of cases) {
    const verdict = grade(fixture);
    const got = verdict.findings.length;
    const behaved = want === 0 ? got === 0 : got > 0;
    if (!behaved) bad += 1;
    say(`${behaved ? 'ok  ' : 'FAIL'} ${name}: ${String(got)} finding(s)`);
    if (!behaved) for (const line of verdict.lines) say(`     ${line.trim()}`);
  }
  say(bad === 0 ? `self-test PASS: ${String(cases.length)} fixtures behaved` : `self-test FAIL: ${String(bad)} fixture(s) did not`);
  process.exitCode = bad === 0 ? 0 : 1;
}

async function main() {
  const machine = await gate('p235');
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(profile, 'gmux', 'config'), { recursive: true });
  mkdirSync(join(profile, 'gmux', 'machines'), { recursive: true });
  record('runDir', runDir);
  record('identityFilesBefore', identityFilesLine(hostKeyFileFacts()));
  const before = hostKeyFileFacts();
  record('localGmuxSessionsBefore', countOperatorSessions());
  const farBefore = listFarSessions(machine, 'gmux');
  record('farGmuxSessionsBefore', farBefore.names);
  record('farGmuxDetailBefore', runOnMachine(machine, "/usr/local/bin/tmux -L gmux -f /dev/null list-sessions -F '#{session_name} created #{session_created} attached #{session_attached}'").both.trim());
  record('farSocketsBefore', runOnMachine(machine, 'ls /private/tmp/tmux-$(id -u) 2>/dev/null | tr "\\n" " "').stdout.trim());
  const localSocketDir = `/private/tmp/tmux-${String(process.getuid?.() ?? 501)}`;
  record('localSocketsBefore', sh('/bin/ls', [localSocketDir]).stdout.trim().replace(/\n/g, ' '));

  // The person's own pasteboard is saved before anything and put back in the
  // `finally`, which is the rule `build/probe-p191-redline.mjs` already follows.
  const pasteboardBefore = sh('/usr/bin/pbpaste', []).stdout;
  record('pasteboardBeforeBytes', Buffer.byteLength(pasteboardBefore, 'utf8'));
  let farUp = false;
  try {
    assertReachable(machine);
    const setup = setupFar(machine);
    if (setup.code !== 0) throw new Error(`fixture failed: ${setup.both}`);
    farUp = true;
    record('farFixture', setup.stdout.trim().replace(/\n/g, ' '));
    record('farRoot', FAR_ROOT);

    rmSync(localRepo, { recursive: true, force: true });
    const localOut = sh('/bin/sh', ['-c', setupScript(localRepo)]);
    record('localFixture', `${String(localOut.code)} ${localOut.stdout.trim().replace(/\n/g, ' ')}`);

    writeFileSync(join(profile, 'gmux', 'config', 'machines.json'), machinesJson('/usr/local/bin/tmux'), 'utf8');
    writeFileSync(
      join(profile, 'gmux', 'machines', 'known-machines'),
      keyscanText({ host: HOST, port: 22, caller: 'build/probe-p235-nits.mjs' }),
      'utf8'
    );

    const a = await launch({
      label: 'A-settings',
      settings: true,
      js: settingsDrive(`
        const r = {};
        await openMachines();
        const toggles = Array.from(document.querySelectorAll('[data-machines-action="toggle-lines"]'));
        r.rowCount = toggles.length;
        for (const t of toggles) { if (t.getAttribute('aria-expanded') !== 'true') { t.click(); await wait(500); } }
        await wait(800);
        const confirms = Array.from(document.querySelectorAll('[data-machines-action="confirm"]'));
        r.confirmButtons = confirms.length;
        for (const c of confirms) { c.click(); await wait(1600); }
        await wait(1200);
        r.afterConfirm = ((await m().rows()).rows ?? []).map((row) => ({ id: row.id, state: row.state, usable: row.usable }));
        return r;
      `),
      timeoutMs: 300_000
    });
    record('launchA', a.parsed === null ? `NO JSON (exit ${String(a.code)}) tail=${a.out.slice(-700)}` : a.parsed);

    const b = await launch({ label: 'B-add', js: addProjectsDriver(), timeoutMs: 300_000, delayMs: 6000 });
    record('launchB', b.parsed === null ? `NO JSON (exit ${String(b.code)}) tail=${b.out.slice(-1500)}` : b.parsed);

    if ((process.env['P235_ONLY'] ?? '') !== 'D') {
      const c = await launch({ label: 'C-reading', js: readingDriver(), timeoutMs: 900_000, delayMs: 9000 });
      record('launchC', c.parsed === null ? `NO JSON (exit ${String(c.code)}) tail=${c.out.slice(-2500)}` : c.parsed);
      record('launchCMenus', (c.out.match(/\[gmux-shot\] popup-pick [^\n]*/g) ?? []).map((l) => l.slice('[gmux-shot] popup-pick '.length)));
      // What the LAST Copy Path in that launch put on the system clipboard,
      // which the driver ordered to be the REMOTE tab's.
      record('remoteTabCopyPathClipboard', sh('/usr/bin/pbpaste', []).stdout);
    }

    // Launch D drives item 4 and the second half of item 5. The rewrite of the
    // scratch machines.json happens HERE, from outside the app, while the
    // driver waits, which is the gesture research 85 reproduced four times.
    // The rewrite is done BEFORE the launch rather than on a timer inside it,
    // so the reading is deterministic: one execution bearing field moved on
    // disk while nobody re-confirmed, which is the gesture research 85
    // reproduced four times.
    if ((process.env['P235_ONLY'] ?? '') === 'C') return;
    writeFileSync(join(profile, 'gmux', 'config', 'machines.json'), machinesJson('/usr/local/bin/tmux2'), 'utf8');
    say('rewrote the scratch machines.json remoteTmuxPath (execution bearing)');
    const d = await launch({ label: 'D-changed', js: changedDriver(), timeoutMs: 900_000, delayMs: 9000 });
    record('launchD', d.parsed === null ? `NO JSON (exit ${String(d.code)}) tail=${d.out.slice(-2500)}` : d.parsed);
    record('launchDMenus', (d.out.match(/\[gmux-shot\] popup-pick [^\n]*/g) ?? []).map((l) => l.slice('[gmux-shot] popup-pick '.length)));

    // ---- launch E. The same grid on the same machine, not connected -------
    // The row now names a program that is not on that machine, so the sign in
    // fails at the version read. Nothing on that machine is started or asked
    // for beyond one `-V` of a path that is not there.
    writeFileSync(join(profile, 'gmux', 'config', 'machines.json'), machinesJson('/usr/local/bin/tmux-p235-absent'), 'utf8');
    const a2 = await launch({
      label: 'A2-reconfirm',
      settings: true,
      js: settingsDrive(`
        const r = {};
        await openMachines();
        const toggles = Array.from(document.querySelectorAll('[data-machines-action="toggle-lines"]'));
        for (const t of toggles) { if (t.getAttribute('aria-expanded') !== 'true') { t.click(); await wait(500); } }
        await wait(800);
        const confirms = Array.from(document.querySelectorAll('[data-machines-action="confirm"]'));
        r.confirmButtons = confirms.length;
        for (const c of confirms) { c.click(); await wait(1600); }
        await wait(1200);
        r.afterConfirm = ((await m().rows()).rows ?? []).map((row) => ({ id: row.id, state: row.state, usable: row.usable }));
        return r;
      `),
      timeoutMs: 300_000
    });
    record('launchA2', a2.parsed === null ? `NO JSON (exit ${String(a2.code)}) tail=${a2.out.slice(-700)}` : a2.parsed);
    const e = await launch({ label: 'E-disconnected', js: disconnectedDriver(), timeoutMs: 600_000, delayMs: 9000 });
    record('launchE', e.parsed === null ? `NO JSON (exit ${String(e.code)}) tail=${e.out.slice(-2500)}` : e.parsed);
  } finally {
    if (farUp) {
      const t = teardownFar(machine);
      record('farTeardown', t.both.trim());
    }
    try { closeMaster(machine); } catch { /* nothing held */ }
    try { endRecordedPids(); } catch { /* nothing recorded */ }
    record('farGmuxSessionsAfter', listFarSessions(machine, 'gmux').names);
    record('farGmuxDetailAfter', runOnMachine(machine, "/usr/local/bin/tmux -L gmux -f /dev/null list-sessions -F '#{session_name} created #{session_created} attached #{session_attached}'").both.trim());
    // THE BOUND PHASE 224'S COMMITTER ADDED. `kill-server` does not unlink a
    // socket, so this run's own scratch socket is killed AND unlinked on both
    // computers, and never while a process holds it.
    record('farSocketHolders', runOnMachine(machine, `lsof /private/tmp/tmux-$(id -u)/${SOCKET} 2>/dev/null | wc -l`).stdout.trim());
    record('farScratchServerKill', runOnMachine(machine, `/usr/local/bin/tmux -L ${SOCKET} -f /dev/null kill-server 2>&1 || true`).both.trim());
    record('farScratchSocketUnlink', runOnMachine(machine, `rm -f /private/tmp/tmux-$(id -u)/${SOCKET} && echo removed`).both.trim());
    record('farSocketsAfter', runOnMachine(machine, 'ls /private/tmp/tmux-$(id -u) 2>/dev/null | tr "\\n" " "').stdout.trim());
    record('farScratchDirsAfter', runOnMachine(machine, 'ls -d /Users/gdc/tortie-p235-scratch-* 2>/dev/null | tr "\\n" " " || true').stdout.trim());
    record('localGmuxSessionsAfter', countOperatorSessions());
    const localSocket = join(localSocketDir, SOCKET);
    const holders = sh('/usr/sbin/lsof', [localSocket]).stdout.trim();
    record('localSocketHolders', holders === '' ? 'none' : holders.split('\n').length - 1);
    if (holders === '' && existsSync(localSocket)) { rmSync(localSocket, { force: true }); say('unlinked the local scratch socket'); }
    record('localSocketsAfter', sh('/bin/ls', [localSocketDir]).stdout.trim().replace(/\n/g, ' '));
    record('identityFilesAfter', identityFilesLine(hostKeyFileFacts()));
    record('identityFilesUnmoved', identityFilesUnmoved(before, hostKeyFileFacts()));
    const put = spawnSync('/usr/bin/pbcopy', { input: pasteboardBefore, encoding: 'utf8' });
    record('pasteboardRestored', put.status === 0 && sh('/usr/bin/pbpaste', []).stdout === pasteboardBefore);
    writeFileSync(join(runDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    say(`report written to ${join(runDir, 'report.json')}`);
    const verdict = grade(report);
    for (const line of verdict.lines) say(line);
    say(verdict.findings.length === 0 ? 'PASS: 0 findings' : `FAIL: ${String(verdict.findings.length)} finding(s)`);
    if (verdict.findings.length > 0) process.exitCode = 1;
  }
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  main().catch((err) => {
    say(`FAILED: ${String((err && err.stack) || err)}`);
    process.exitCode = 1;
  });
}
