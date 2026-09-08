#!/usr/bin/env node
/**
 * Phase 234, the APP RUN. The Architecture face on a remote tab beside the
 * same view on a local tab holding the SAME repository, read off the DOM in
 * one app run and compared row for row.
 *
 * It is the measure step's own probe, `.p234/probe-p234-parent.mjs`, moved
 * under `build/` unchanged in what it drives and given one thing it did not
 * have: a GRADER. At the parent the remote pane drew the word ARCHITECTURE and
 * nothing else, 12 characters and 0 rows, and the local pane drew five rows and
 * 1,719 characters. At HEAD the two faces must carry the SAME repository line,
 * the SAME rows with the SAME sentences and the SAME hover facts, and the
 * remote face must carry no word the local one does not. The probe EXITS NON
 * ZERO when they differ, so it is a check rather than a printout.
 *
 * `P234_PARENT=1` grades the other way round, which is what a run at the parent
 * commit is for: it then fails unless the remote face is empty.
 *
 * SAFETY, inherited from Phase 224 exactly. Every ssh goes through
 * build/ssh-run.mjs by way of build/real-machine.mjs. Every write on the far
 * machine goes under ONE path this run composes and it is removed in a
 * `finally` whatever happened. The far machine's own `-L gmux` server is only
 * ever LISTED, before and after. This Mac's `-L gmux` server is only ever
 * LISTED. Every Electron goes through build/electron-run.mjs on a scratch
 * profile and a scratch socket and is ended in a `finally` by that helper. The
 * far side scratch server this run's socket name starts is killed AND ITS
 * SOCKET FILE UNLINKED in the same `finally`, which is the one bound Phase
 * 224's committer added; the local scratch socket is unlinked too, and neither
 * is unlinked while a process holds it. No token is spent; no agent runs.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
import { setupFar, teardownFar, runScript, setupScript, FAR_ROOT } from './p234/far-fixture.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p234]';
const say = (t) => process.stdout.write(`${TAG} ${t}\n`);
const runDir = join('/private/tmp', `p234-run-${String(process.pid)}`);
const profile = join(runDir, 'profile');
const localRepo = join(runDir, 'local-fixture');
const SOCKET = `gmux-p234-${String(process.pid)}`;
const MACHINE_ID = 'greg-s-mac-pro';
const MACHINE_LABEL = 'Greg’s Mac Pro';
const HOST = 'gregs-mac-pro.tail2ddfe1.ts.net';

const AT_PARENT = process.env['P234_PARENT'] === '1';
const report = {
  when: new Date().toISOString(),
  tree: AT_PARENT ? 'the parent' : 'HEAD',
  socket: SOCKET
};
const findings = [];
const finding = (t) => {
  findings.push(t);
  say(`FINDING: ${t}`);
};
const record = (k, v) => {
  report[k] = v;
  say(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v).slice(0, 600)}`);
};

function sh(file, args, options = {}) {
  const o = spawnSync(file, args, { encoding: 'utf8', timeout: 120_000, ...options });
  return { code: o.status ?? -1, stdout: o.stdout ?? '', stderr: o.stderr ?? '' };
}

/** Launch the app once and read back the one JSON the driver printed. */
function launch({ label, js, settings, timeoutMs = 600_000, delayMs = 4000 }) {
  const env = {
    ...process.env,
    GMUX_SHOT: join(runDir, `${label}.png`),
    GMUX_SHOT_DELAY_MS: String(delayMs),
    GMUX_TMUX_SOCKET: SOCKET
  };
  if (settings) {
    env['GMUX_SHOT_SETTINGS'] = '1';
    env['GMUX_SHOT_SETTINGS_JS'] = js;
  } else {
    env['GMUX_SHOT_JS'] = js;
  }
  return withElectron(
    { label: `p234-${label}`, userDataDir: profile, cwd: repoRoot, env, tmuxSocket: SOCKET, ceilingMs: timeoutMs + 60_000 },
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
  const until = async (fn, budget = 90000, step = 100) => {
    const t0 = now();
    for (;;) { let v = false; try { v = fn(); } catch (e) { v = false; }
      if (v) return Math.round(now() - t0);
      if (now() - t0 >= budget) return null;
      await wait(step); }
  };
  const sidebar = () => document.querySelector('[data-slot="sidebar"]');
  const sidebarText = () => { const s = sidebar(); return s === null ? '(no sidebar)' : (s.innerText || '').trim(); };
  const railTitles = () => Array.from(document.querySelectorAll('button.ab-item')).map((b) => b.getAttribute('title'));
  const railButton = (label) => Array.from(document.querySelectorAll('button.ab-item'))
    .find((b) => (b.getAttribute('title') || '').startsWith(label + ' ('));
  const selectProject = async (projectId) => {
    const wrap = document.querySelector('[data-project-id="' + projectId + '"]');
    if (wrap === null) return 'no-tab';
    const btn = wrap.querySelector('button.ptab');
    if (btn === null) return 'no-button';
    btn.click();
    await wait(800);
    return btn.getAttribute('aria-current') === 'true' ? 'selected' : 'clicked';
  };
  // The pane, in the terms probe-p201-reading.mjs reads it.
  const readPane = () => {
    const pane = document.querySelector('[data-view="arch"]');
    if (pane === null) return { pane: false, sidebar: sidebarText().slice(0, 600) };
    const text = (el) => (el === null || el === undefined ? null : (el.textContent ?? '').trim());
    const header = pane.querySelector('.view-header') ?? document.querySelector('.view-header');
    const actions = header === null ? [] : [...header.querySelectorAll('.view-header-action')].map((b) => ({
      label: b.getAttribute('aria-label') ?? '', title: b.getAttribute('title') ?? '', disabled: b.disabled === true
    }));
    const rows = [...pane.querySelectorAll('[data-slot="arch-reading"] li[data-group]')].map((li) => {
      const row = li.querySelector('.rd-part');
      return {
        id: li.getAttribute('data-group'),
        label: text(li.querySelector('.rd-part-name')),
        weight: li.querySelector('.rd-bar')?.getAttribute('title') ?? null,
        sentence: text(li.querySelector('.rd-part-sentence')),
        facts: (row?.getAttribute('title') ?? '').split('\\n')
      };
    });
    const paneText = (pane.innerText || '').trim();
    return {
      pane: true,
      actions,
      subject: text(pane.querySelector('[data-slot="arch-reading-repo"] .arch-subject')),
      line: text(pane.querySelector('[data-slot="arch-reading-repo"] .rd-line')),
      model: text(pane.querySelector('[data-slot="arch-reading-model"]')),
      modelButtons: pane.querySelectorAll('[data-slot="arch-reading-model"] button').length,
      contractSection: pane.querySelector('section[aria-label="Contract"]') !== null,
      contractHeading: text(pane.querySelector('section[aria-label="Contract"] .section-header')),
      componentsSection: pane.querySelector('section[aria-label="Components"]') !== null,
      crumb: text(pane.querySelector('.arch-crumb-here')),
      rows,
      paneChars: paneText.length,
      // PHASE 234. The WHOLE pane text, because the operator's rule is a
      // comparison of two faces and a truncated one compares two prefixes.
      paneText: paneText.slice(0, 20000),
      paneChildren: pane.children.length,
      paneHtmlHead: pane.innerHTML.slice(0, 300)
    };
  };
  const filled = () => {
    const pane = document.querySelector('[data-view="arch"]');
    if (pane === null) return false;
    const line = (pane.querySelector('[data-slot="arch-reading-repo"] .rd-line')?.textContent ?? '');
    const m = line.match(/of ([\\d,]+) imports/);
    if (m === null || Number(m[1].replace(/,/g, '')) === 0) return false;
    return pane.querySelectorAll('[data-slot="arch-reading"] li[data-group]').length > 0;
  };
  const openArch = async () => {
    let btn = railButton('Architecture');
    const t0 = now();
    while (btn === undefined && now() - t0 < 10000) { await wait(200); btn = railButton('Architecture'); }
    if (btn === undefined) return { opened: false, rail: railTitles() };
    btn.click();
    await wait(400);
    return { opened: true };
  };
`;

function addProjectsDriver() {
  return `(async () => {${PRELUDE}
  const out = {};
  try {
    out.boot = await until(() => (document.body.innerText || '').length > 40, 60000);
    out.prepare = JSON.stringify(await G.machines.prepare(${JSON.stringify(MACHINE_ID)})).slice(0, 200);
    out.local = JSON.stringify(await G.projects.add(${JSON.stringify(localRepo)})).slice(0, 200);
    out.remote = JSON.stringify(await G.projects.addRemote({ machineId: ${JSON.stringify(MACHINE_ID)}, path: ${JSON.stringify(FAR_ROOT)} })).slice(0, 300);
    await wait(2000);
    out.list = JSON.stringify(await G.projects.list()).slice(0, 900);
    return JSON.stringify(out);
  } catch (e) { out.error = String((e && e.stack) || e); return JSON.stringify(out); }
})()`;
}

function facesDriver() {
  return `(async () => {${PRELUDE}
  const out = { boot: {}, remote: {}, local: {}, remoteAgain: {}, notes: [] };
  const MID = ${JSON.stringify(MACHINE_ID)};
  try {
    out.boot.railAtMs = await until(() => document.querySelectorAll('button.ab-item').length > 0, 90000);
    out.boot.tabsAtMs = await until(() => document.querySelectorAll('[data-project-id]').length >= 2, 90000);
    // Architecture ships off. Turn it on in THIS profile the way Settings does.
    const before = await G.settingsGet();
    const next = await G.settingsSet({ arch: { enabled: true, agentId: before.arch.agentId, model: before.arch.model } });
    out.boot.archEnabled = next.arch.enabled;
    await wait(800);
    out.boot.rail = railTitles();
    const list = await G.projects.list();
    out.remoteProjectId = (list.find((p) => p.machineId === MID) || {}).id ?? null;
    out.localProjectId = (list.find((p) => !p.machineId) || {}).id ?? null;
    const t0 = now();
    out.boot.prepare = JSON.stringify(await G.machines.prepare(MID)).slice(0, 260);
    out.boot.prepareMs = Math.round(now() - t0);
    await wait(1500);

    // ---- the remote face -------------------------------------------------
    out.remote.select = await selectProject(out.remoteProjectId);
    await wait(1200);
    out.remote.open = await openArch();
    const tr = now();
    out.remote.samples = [];
    for (const at of [500, 2000, 5000, 10000, 15000]) {
      await until(() => now() - tr >= at, 30000, 50);
      const p = readPane();
      out.remote.samples.push({ at, rows: p.rows ? p.rows.length : null, paneChars: p.paneChars ?? null, line: p.line ?? null });
    }
    out.remote.face = readPane();
    out.remote.sidebarText = sidebarText().slice(0, 800);
    out.remote.viewHeaderText = (document.querySelector('[data-slot="view-header"]')?.innerText || '').trim();

    // ---- the local face, the same repository -----------------------------
    const home = railButton('Explorer'); if (home !== undefined) { home.click(); await wait(600); }
    out.local.select = await selectProject(out.localProjectId);
    await wait(1200);
    out.local.open = await openArch();
    const tl = now();
    out.local.filledMs = await until(filled, 90000, 100);
    out.local.face = readPane();
    out.local.sidebarText = sidebarText().slice(0, 800);

    // ---- the remote face again, after the local one filled ---------------
    const home2 = railButton('Explorer'); if (home2 !== undefined) { home2.click(); await wait(600); }
    out.remoteAgain.select = await selectProject(out.remoteProjectId);
    await wait(1200);
    out.remoteAgain.open = await openArch();
    await wait(3000);
    out.remoteAgain.face = readPane();

    return JSON.stringify(out);
  } catch (e) { out.error = String((e && e.stack) || e); return JSON.stringify(out); }
})()`;
}


/**
 * THE GRADER, and it is the whole reason this probe is under `build/`.
 *
 * The measure step read the two faces and printed them. This holds them against
 * each other and fails, because the phase's claim is PARITY: the same rows, the
 * same sentences, the same facts, and no word on the remote face that the local
 * one does not also carry.
 *
 * The comparison is deliberately by VALUE and not by a pinned table. A table
 * pinned here would go stale the day the fixture changes and would tell nobody
 * anything about the operator's own repositories; what has to be true is that
 * the two arms agree, whatever they say.
 */
function grade(b2) {
  if (b2 === null || typeof b2 !== 'object') {
    finding('launch B2 printed no JSON, so nothing was read on either face');
    return;
  }
  const remote = b2.remote?.face ?? null;
  const local = b2.local?.face ?? null;
  if (remote === null || local === null) {
    finding('one of the two faces was never read');
    return;
  }

  if (AT_PARENT) {
    // The parent reading: the remote pane draws its header and nothing under
    // it. This arm exists so a run at the parent is a red check rather than a
    // silent pass, which is what makes the HEAD reading mean something.
    if ((remote.rows ?? []).length !== 0) {
      finding(`at the parent the remote face drew ${String((remote.rows ?? []).length)} rows`);
    }
    if ((local.rows ?? []).length === 0) {
      finding('at the parent the local face drew no rows either, so the run read nothing');
    }
    record('grade', { arm: 'parent', findings: findings.length });
    return;
  }

  // 1. The remote face draws the reading at all.
  if ((remote.rows ?? []).length === 0) {
    finding('the remote face drew no reading rows');
  }
  if ((remote.paneChars ?? 0) < 200) {
    finding(`the remote pane holds ${String(remote.paneChars ?? 0)} characters, so it is still empty`);
  }

  // 2. The two faces agree, row for row, sentence for sentence, fact for fact.
  if (remote.line !== local.line) {
    finding(`the repository line differs.\n  remote: ${String(remote.line)}\n  local:  ${String(local.line)}`);
  }
  if (remote.subject !== local.subject) {
    finding(`the subject differs: remote ${String(remote.subject)}, local ${String(local.subject)}`);
  }
  const rowKey = (r) => `${String(r.id)}|${String(r.label)}|${String(r.weight)}|${String(r.sentence)}|${(r.facts ?? []).join(' / ')}`;
  const remoteRows = (remote.rows ?? []).map(rowKey);
  const localRows = (local.rows ?? []).map(rowKey);
  if (remoteRows.length !== localRows.length) {
    finding(`${String(remoteRows.length)} rows on the remote face against ${String(localRows.length)} on the local one`);
  }
  for (let at = 0; at < Math.max(remoteRows.length, localRows.length); at += 1) {
    if (remoteRows[at] !== localRows[at]) {
      finding(`row ${String(at)} differs.\n  remote: ${String(remoteRows[at])}\n  local:  ${String(localRows[at])}`);
    }
  }

  // 3. The contract's place, and the model slot.
  if (remote.contractSection !== local.contractSection) {
    finding(`the contract section is ${remote.contractSection ? 'on' : 'off'} the remote face and ${local.contractSection ? 'on' : 'off'} the local one`);
  }
  if (remote.model !== local.model || remote.modelButtons !== local.modelButtons) {
    finding(`the model slot differs: remote ${JSON.stringify(remote.model)} with ${String(remote.modelButtons)} buttons, local ${JSON.stringify(local.model)} with ${String(local.modelButtons)}`);
  }

  // 4. THE OPERATOR'S RULE. Every word on the remote face is a word the local
  //    face carries, and every header action reads the same on both.
  const words = (t) => String(t ?? '').split(/\s+/).filter((one) => one.length > 0);
  const localWords = new Set(words(local.paneText));
  const extra = words(remote.paneText).filter((one) => !localWords.has(one));
  if (extra.length > 0) {
    finding(`the remote face carries ${String(extra.length)} word(s) the local face does not: ${extra.slice(0, 20).join(' ')}`);
  }
  // THE OTHER DIRECTION IS RECORDED AND IS NOT A FINDING. The operator's rule
  // is one directional: nothing may appear ONLY on the remote face. What the
  // LOCAL face carries and the remote one does not is this phase's two stated
  // limits, being the enrichment pass, which runs an agent and writes contract
  // files, and the Accept control, which appends to `baseline.json`. Both are
  // absent sections rather than sentences, and the report names them so a
  // reader can see the whole of the difference.
  const remoteWords = new Set(words(remote.paneText));
  record('wordsOnlyOnTheLocalFace', [...new Set(words(local.paneText).filter((one) => !remoteWords.has(one)))]);
  const actionKey = (a) => `${a.label}|${a.title}|${String(a.disabled)}`;
  const remoteActions = (remote.actions ?? []).map(actionKey);
  const localActions = (local.actions ?? []).map(actionKey);
  if (JSON.stringify(remoteActions) !== JSON.stringify(localActions)) {
    finding(`the header actions differ.\n  remote: ${remoteActions.join('  ')}\n  local:  ${localActions.join('  ')}`);
  }

  record('grade', {
    arm: 'HEAD',
    remoteRows: remoteRows.length,
    localRows: localRows.length,
    line: remote.line,
    extraWords: extra.length,
    findings: findings.length
  });
}

async function main() {
  mkdirSync(join(profile, 'gmux', 'config'), { recursive: true });
  mkdirSync(join(profile, 'gmux', 'machines'), { recursive: true });
  mkdirSync(localRepo, { recursive: true });

  const machine = await gate('p234');
  record('runDir', runDir);
  record('identityFilesBefore', identityFilesLine(machine.identityBefore));
  const t0 = Date.now();
  assertReachable(machine);
  record('signInMs', Date.now() - t0);
  record('localGmuxSessionsBefore', countOperatorSessions());
  const farBefore = listFarSessions(machine, 'gmux');
  record('farGmuxSessionsBefore', farBefore.names);
  record('farGmuxSessionDetailBefore', runOnMachine(machine, "/usr/local/bin/tmux -L gmux -f /dev/null list-sessions -F '#{session_name} created #{session_created} attached #{session_attached}'").both.trim());
  record('farTmuxProcessesBefore', runOnMachine(machine, "ps -Ao pid,command | grep -c '[t]mux' || true").stdout.trim());
  record('farSocketsBefore', runOnMachine(machine, 'ls /private/tmp/tmux-$(id -u) 2>/dev/null | tr "\\n" " "').stdout.trim());
  const localSocketDir = `/private/tmp/tmux-${String(process.getuid?.() ?? 501)}`;
  record('localSocketsBefore', sh('/bin/ls', [localSocketDir]).stdout.trim().replace(/\n/g, ' '));

  let farUp = false;
  try {
    const setup = setupFar(machine);
    if (setup.code !== 0) throw new Error(`fixture failed: ${setup.both}`);
    farUp = true;
    record('farFixture', setup.stdout.trim().replace(/\n/g, ' '));
    record('farRoot', FAR_ROOT);

    rmSync(localRepo, { recursive: true, force: true });
    const localOut = sh('/bin/sh', ['-c', setupScript(localRepo)]);
    record('localFixture', `${String(localOut.code)} ${localOut.stdout.trim().replace(/\n/g, ' ')} ${localOut.stderr.trim().slice(0, 200)}`);

    writeFileSync(
      join(profile, 'gmux', 'config', 'machines.json'),
      `${JSON.stringify({
        schema: 1,
        machines: [
          { id: MACHINE_ID, label: MACHINE_LABEL, color: 'orange', host: HOST, remoteTmuxPath: '/usr/local/bin/tmux' }
        ]
      }, null, 2)}\n`,
      'utf8'
    );
    writeFileSync(
      join(profile, 'gmux', 'machines', 'known-machines'),
      keyscanText({ host: HOST, port: 22, caller: '.p234/probe-p234-parent.mjs' }),
      'utf8'
    );

    // ---- Launch A. Confirm the machine in this scratch profile -----------
    const a = await launch({
      label: 'A-settings',
      settings: true,
      js: settingsDrive(`
        const r = {};
        await openMachines();
        const toggles = Array.from(document.querySelectorAll('[data-machines-action="toggle-lines"]'));
        r.rowCount = toggles.length;
        for (const t of toggles) {
          if (t.getAttribute('aria-expanded') !== 'true') { t.click(); await wait(500); }
        }
        await wait(800);
        const confirms = Array.from(document.querySelectorAll('[data-machines-action="confirm"]'));
        r.confirmButtons = confirms.length;
        for (const c of confirms) { c.click(); await wait(1600); }
        await wait(1000);
        r.afterConfirm = (await m().rows()).map((row) => ({ id: row.id, confirmed: row.confirmed ?? row.confirmation ?? null, status: row.status ?? null }));
        r.pageText = (document.body.innerText || '').slice(0, 500);
        return r;
      `),
      timeoutMs: 300_000
    });
    record('launchA', a.parsed === null ? `NO JSON (exit ${String(a.code)}) tail=${a.out.slice(-600)}` : a.parsed);

    // ---- Launch B1. Register the two projects -----------------------------
    const b1 = await launch({ label: 'B1-add', js: addProjectsDriver(), timeoutMs: 300_000, delayMs: 6000 });
    record('launchB1', b1.parsed === null ? `NO JSON (exit ${String(b1.code)}) tail=${b1.out.slice(-1200)}` : b1.parsed);

    // ---- Launch B2. The two faces, side by side ----------------------------
    const b2 = await launch({ label: 'B2-faces', js: facesDriver(), timeoutMs: 900_000, delayMs: 8000 });
    record('launchB2', b2.parsed === null ? `NO JSON (exit ${String(b2.code)}) tail=${b2.out.slice(-2000)}` : b2.parsed);
    // Did main log anything about arch on the remote tab, and which scripts crossed?
    const scriptsSent = (b2.out.match(/\[gmux-remote\][^\n]*/g) ?? []).slice(0, 40);
    record('launchB2RemoteLogLines', scriptsSent);
    record('launchB2ArchLogLines', (b2.out.match(/[^\n]*arch[^\n]*/gi) ?? []).filter((l) => !/electron-run|GMUX_SHOT/.test(l)).slice(0, 30));

    const after = runScript(machine, `cd ${FAR_ROOT}\ngit status --porcelain=v1\necho --- log ---\ngit log --oneline\n`);
    record('farRepoAfter', after.both.trim());
    grade(b2.parsed);
  } finally {
    if (farUp) {
      const t = teardownFar(machine);
      record('farTeardown', t.both.trim());
    }
    // The far side server this run's own socket name started: killed by name,
    // then its socket file unlinked unless a process still holds it.
    if (/^gmux-p234-\d+$/.test(SOCKET)) {
      const k = runOnMachine(machine, `/usr/local/bin/tmux -L ${SOCKET} -f /dev/null kill-server 2>&1 || true`);
      record('farScratchServerKilled', `${SOCKET}: ${k.both.trim() || 'gone'}`);
      const u = runOnMachine(
        machine,
        `s=/private/tmp/tmux-$(id -u)/${SOCKET}; if [ -e "$s" ]; then if lsof "$s" >/dev/null 2>&1; then echo HELD; else rm -f "$s" && echo UNLINKED; fi; else echo ABSENT; fi`
      );
      record('farScratchSocketUnlink', u.both.trim());
      const localSock = join(localSocketDir, SOCKET);
      if (existsSync(localSock)) {
        const held = sh('/usr/sbin/lsof', [localSock]).code === 0;
        if (held) record('localScratchSocketUnlink', 'HELD, left in place');
        else { rmSync(localSock, { force: true }); record('localScratchSocketUnlink', 'UNLINKED'); }
      } else {
        record('localScratchSocketUnlink', 'ABSENT');
      }
    }
    const farAfter = listFarSessions(machine, 'gmux');
    record('farGmuxSessionsAfter', farAfter.names);
    record('farGmuxSessionDetailAfter', runOnMachine(machine, "/usr/local/bin/tmux -L gmux -f /dev/null list-sessions -F '#{session_name} created #{session_created} attached #{session_attached}'").both.trim());
    record('farTmuxProcessesAfter', runOnMachine(machine, "ps -Ao pid,command | grep -c '[t]mux' || true").stdout.trim());
    record('farSocketsAfter', runOnMachine(machine, 'ls /private/tmp/tmux-$(id -u) 2>/dev/null | tr "\\n" " "').stdout.trim());
    record('farLeftoverDirs', runOnMachine(machine, "ls -d /Users/gdc/tortie-p234-scratch-* /Users/gdc/tortie* 2>/dev/null || echo NONE").both.trim());
    record('localSocketsAfter', sh('/bin/ls', [localSocketDir]).stdout.trim().replace(/\n/g, ' '));
    record('localGmuxSessionsAfter', countOperatorSessions());
    record('identityFilesAfter', identityFilesLine(hostKeyFileFacts()));
    record('identityFilesUnmoved', identityFilesUnmoved(machine.identityBefore, hostKeyFileFacts()));
    closeMaster(machine);
    record('endedPids', endRecordedPids(machine));
    report.findings = findings;
    writeFileSync(join(runDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    say(`report written to ${join(runDir, 'report.json')}`);
  }
}

await main();
if (findings.length > 0) {
  process.stderr.write(`${TAG} FAIL, ${String(findings.length)} finding(s):\n`);
  for (const one of findings) process.stderr.write(`  - ${one}\n`);
  process.exit(1);
}
say(
  AT_PARENT
    ? 'PASS at the parent: the remote face is empty and the local one is not.'
    : 'PASS: the two faces carry the same reading, the same rows, the same ' +
      'sentences, the same facts and the same words.'
);
