#!/usr/bin/env node
/**
 * probe-p277-save.mjs. THE PHASE 277 APP RUN: a save may not mark newer typing
 * clean, and a timer may not outlive its policy (audit F1 and F2).
 *
 * ONE Electron on a scratch profile, a scratch HOME and this script's own tmux
 * socket, over one git project it builds inside its own scratch directory. It
 * spawns no agent, spends no token, opens no keychain and makes no request.
 * The renderer half is src/renderer/editor/p277-save-drive.ts, registered by
 * src/renderer/app/probe-registry.ts only when GMUX_PROBES is set.
 *
 * ## What it proves, and why it has to be a run
 *
 * The unit suites prove the completion rule over a model DOUBLE. The audit
 * records that the one clause connecting F1 to lost work was never driven in a
 * real Monaco tab: a tab that reads clean while it holds unsaved typing is
 * closed by `closeTab` with no question at all (store.ts, `closeTab` asks only
 * when `dirty` is true). Only a run reads that off the dialog a person sees.
 *
 *   1. THE NEWER TYPING STAYS DIRTY (audit F1). Type `first edit` with auto
 *      save Off, switch to After a delay at 5 s, then `saveThenType`: start ⌘S's
 *      save and type ` plus newer typing` in the SAME synchronous turn, so the
 *      edit lands between the buffer being read and the write being answered.
 *      Read back: the buffer holds the newer text, the baseline is the OLDER
 *      text, the file on disk is the older text, and the tab is STILL DIRTY.
 *   3. CLOSE STILL ASKS. Driven SECOND, in the same renderer turn chain as arm
 *      1, because it has to happen while the typing is unsaved. Press close and
 *      read the question off the DOM — `.modal[role="alertdialog"]`, its title,
 *      its three buttons — and the dirty dot off the tab strip. Never off the
 *      store. Then press the real Cancel button and read the tab still there.
 *   2. IT SAVES WHEN PERMITTED. Driven THIRD. With nothing else pressed, the
 *      pending timer writes: the file on disk is byte for byte the NEWER text,
 *      the dot leaves the strip, and the write was auto save's own — the tab
 *      reads touched, which the explicit save in arm 1 never sets. At the
 *      parent the false clean edge cancelled that timer, so this arm fails
 *      there too.
 *   4. A TIMER DOES NOT OUTLIVE ITS POLICY (audit F2). With a 10 s delay, the
 *      longest one Settings offers: type, change the policy half a second
 *      later, wait the deadline plus four seconds, and read the file's bytes
 *      and mtime unchanged. Three changes, each on a pending timer of its own:
 *        4a. Off, through the settings store's `update`, the call the Settings
 *            dropdown makes (GeneralSection.tsx).
 *        4b. On focus change, through the same call. The editor holds no focus
 *            when the change lands, so no blur can write and only the old
 *            delay could.
 *        4c. Off, through File > Auto Save's shipped handler
 *            (menu-actions.ts, `toggle-auto-save`).
 *        4d. THE CONTROL. The same delay with no change DOES write within the
 *            deadline plus slack, so an unchanged file above is the policy
 *            change and not a timer that never ran.
 *
 * Each arm prints PASS or its named findings. The run exits 1 on any finding.
 * `readings.json` under the scratch directory keeps every raw reading.
 *
 * ## What it refuses, and what it does not drive
 *
 *   - The socket `gmux` and the socket `default`, by name, before anything
 *     launches. This file names `-L gmux` nowhere: since Phase 285
 *     build/electron-run.mjs's census reads it around the launch, by identity,
 *     so a session the operator starts or ends while this runs is a note
 *     rather than a failure, which is the reading that once failed this run.
 *   - Any agent run, even for its version: every agent row the app would run
 *     is renamed before the launch (build/hidden-agents.mjs), and the app's
 *     own scan is read back and must resolve nothing.
 *   - Any byte outside `GMUX_HARNESS_DIR`.
 *   - Focus emulation. `probe:p268` turns it on for its blur arm; this run
 *     leaves it off on purpose, so arm 4b cannot pass or fail on a blur.
 *   - It does not drive the Settings WINDOW's DOM. That dropdown reaches this
 *     window through main's broadcast, and research for this phase states that
 *     gap as a limit rather than a promise. 4a calls the same `update` in the
 *     editor window.
 *   - Not driven here, and named so nobody reads it as covered: a delay CHANGE
 *     with a timer pending, repeated mode changes, and closing a tab with a
 *     timer pending. `p277-timer-policy.test.ts` owns those. The store's
 *     settings subscription that revokes a pending timer (SPEC S6) is owned by
 *     `p277-store-close-and-policy.test.ts`, which drives the real store.
 *
 * ## Environment
 *
 *   GMUX_TMUX_SOCKET  The scratch socket. build/harness-socket.mjs sets it; when
 *                     it is missing this script re-runs itself under that
 *                     wrapper as `gmux-p277`.
 *   GMUX_HARNESS_DIR  The scratch directory. Set by the same wrapper.
 *
 * `npm run probe:p277` builds first. `--self-test` proves the grader on
 * fixtures and launches nothing.
 *
 * ## SAFETY
 *
 * The Electron is started through build/electron-run.mjs, which ends the tree
 * it started in a `finally` block whatever happened, and the scratch tmux server
 * with it. The socket is handed in by build/harness-socket.mjs, which names it
 * `gmux-p277-<slug>-<pid>`, ends the server afterwards and unlinks its socket
 * and marker. Every other process this script starts is a synchronous `git`
 * that has exited before the call returns.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
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
import {
  AGENTS_LIST_EXPR,
  hiddenAgentsBesides,
  standInsOnlyVerdict,
  writeHiddenAgents
} from '../hidden-agents.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p277]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = (v) => JSON.stringify(v);

// ---------------------------------------------------------------------------
// The grader, proved on fixtures under --self-test.
// ---------------------------------------------------------------------------

/** Every [label, got, want] that disagrees, by value. */
export function grade(rows) {
  return rows
    .filter(([, got, want]) => JSON.stringify(got) !== JSON.stringify(want))
    .map(([l, got, want]) => `${l}: ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

/**
 * Arm 1, judged. `tab` is the tab read after the older save answered, and
 * `onDisk` is the file read straight after. The disk row is what proves the
 * edit really landed while the write was in the air: had the save read the
 * buffer after the edit, the file would hold the newer text.
 */
export function newerStaysDirtyFindings(tab, onDisk, texts) {
  if (tab === undefined) return ['1 the tab is not on the strip after the save answered'];
  return grade([
    ['1 the buffer holds the newer typing', tab.value, texts.newer],
    ['1 the baseline is the older text the save read', tab.savedContents, texts.older],
    ['1 the file on disk holds the older text', onDisk, texts.older],
    ['1 the newer typing is STILL DIRTY', tab.dirty, true]
  ]);
}

/**
 * Arm 3, judged off the DOM. A dialog that never opened is the whole defect,
 * so it is named in a person's words rather than as a boolean.
 */
export function closeAsksFindings(dialog, strip, name) {
  if (!dialog.open) {
    const out = [`3 pressing close on '${name}' with unsaved typing asked nothing`];
    if (!strip.names.includes(name)) out.push(`3 and '${name}' left the strip in silence`);
    return out;
  }
  return grade([
    ['3 the question names the file', dialog.title, `Save changes to '${name}'?`],
    ['3 it offers three answers', dialog.buttons, ["Don't Save", 'Cancel', 'Save']],
    ['3 the tab is still on the strip under the question', strip.names.includes(name), true],
    ['3 and the strip draws its dirty dot', strip.dirty.includes(name), true]
  ]);
}

/** Arm 4, one policy change, judged off the file itself. */
export function unchangedFindings(label, before, after) {
  return grade([
    [`4${label} the file's bytes are unchanged after the deadline`, after.text === before.text, true],
    [`4${label} its mtime never moved`, after.mtime === before.mtime, true]
  ]);
}

function selfTest() {
  const texts = { older: 'a first edit', newer: 'a first edit plus newer typing' };
  const dialog = {
    open: true,
    title: "Save changes to 'notes.md'?",
    buttons: ["Don't Save", 'Cancel', 'Save']
  };
  const strip = { names: ['notes.md'], dirty: ['notes.md'] };
  const fixtures = [
    ['a clean grade is empty', () => grade([['x', 1, 1]]), []],
    ['a disagreement is named', () => grade([['x', 1, 2]]), ['x: 1 want 2']],
    [
      'arm 1 as HEAD should read has no findings',
      () =>
        newerStaysDirtyFindings(
          { value: texts.newer, savedContents: texts.older, dirty: true },
          texts.older,
          texts
        ),
      []
    ],
    [
      "arm 1 at the parent is caught: the audit's own false clean",
      () =>
        newerStaysDirtyFindings(
          { value: texts.newer, savedContents: texts.older, dirty: false },
          texts.older,
          texts
        ),
      ['1 the newer typing is STILL DIRTY: false want true']
    ],
    [
      'arm 1 whose edit landed BEFORE the read is caught, not passed',
      () =>
        newerStaysDirtyFindings(
          { value: texts.newer, savedContents: texts.newer, dirty: false },
          texts.newer,
          texts
        ).length,
      3
    ],
    ['arm 1 with no tab is caught', () => newerStaysDirtyFindings(undefined, '', texts).length, 1],
    ['arm 3 that asked has no findings', () => closeAsksFindings(dialog, strip, 'notes.md'), []],
    [
      'arm 3 at the parent is caught: the silent close',
      () => closeAsksFindings({ open: false }, { names: [], dirty: [] }, 'notes.md'),
      [
        "3 pressing close on 'notes.md' with unsaved typing asked nothing",
        "3 and 'notes.md' left the strip in silence"
      ]
    ],
    [
      'arm 3 whose strip lost the dot is caught',
      () => closeAsksFindings(dialog, { names: ['notes.md'], dirty: [] }, 'notes.md'),
      ['3 and the strip draws its dirty dot: false want true']
    ],
    [
      'arm 4 over an untouched file has no findings',
      () => unchangedFindings('a', { text: 't', mtime: 1 }, { text: 't', mtime: 1 }),
      []
    ],
    [
      'arm 4 over a written file is caught twice',
      () => unchangedFindings('a', { text: 't', mtime: 1 }, { text: 'tu', mtime: 2 }).length,
      2
    ],
    [
      'arm 4 over a rewrite of the same bytes is still caught by the mtime',
      () => unchangedFindings('b', { text: 't', mtime: 1 }, { text: 't', mtime: 2 }),
      ['4b its mtime never moved: false want true']
    ]
  ];
  let ok = true;
  for (const [label, run, want] of fixtures) {
    const got = run();
    const good = JSON.stringify(got) === JSON.stringify(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  }
  say(ok ? `self-test PASS: ${String(fixtures.length)} fixtures behaved` : 'self-test FAIL');
  return ok;
}
if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The socket wrapper, and the refusals.
// ---------------------------------------------------------------------------
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(
    process.execPath,
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p277', `node ${process.argv[1]}`],
    { cwd: REPO, stdio: 'inherit' }
  );
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') {
  console.error(`${TAG} refusing socket ${socket}`);
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

// ---------------------------------------------------------------------------
// The scratch world: one git project holding one file.
// ---------------------------------------------------------------------------
mkdirSync(join(harnessDir, 'p277'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p277'));
const home = join(root, 'h');
const profile = join(root, 'p');
const project = join(root, 'alpha');
for (const d of [home, profile, project]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}
// No agent runs, not even for its version: every probed registry row is
// renamed to a name nothing on this Mac carries, and the app's own scan is
// read back once the window is up.
writeHiddenAgents(profile, 'p277', hiddenAgentsBesides([]));

const git = (cwd, ...a) => {
  const r = spawnSync('git', a, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
  });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
const disk = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
};
const mtime = (path) => {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
};
const fileNow = (path) => ({ text: disk(path), mtime: mtime(path) });

const NOTES_V1 = 'The notes begin here.\n\nA second line of notes.\n';
// The audit's own words for the two texts, so a reader of the fixture and a
// reader of this run meet the same sequence.
const FIRST = 'first edit';
const NEWER = ' plus newer typing';
const OLDER_TEXT = NOTES_V1 + FIRST;
const NEWER_TEXT = OLDER_TEXT + NEWER;

writeFileSync(join(project, 'notes.md'), NOTES_V1);
git(project, 'init', '-q', '-b', 'main');
git(project, 'config', 'user.email', 'p277@example.invalid');
git(project, 'config', 'user.name', 'p277');
git(project, 'add', '.');
git(project, 'commit', '-q', '-m', 'first');

const NOTES = join(project, 'notes.md');
const NAME = 'notes.md';

// ---------------------------------------------------------------------------
// Readers. Every reading about what a PERSON sees is taken off the DOM.
// ---------------------------------------------------------------------------
const P277 = 'window.__gmuxP277';
const STRIP = `(() => {
  const tabs = Array.from(document.querySelectorAll('.ed-tab'));
  return {
    names: tabs.map((t) => (t.querySelector('.ed-tab-name')?.textContent ?? '').trim()),
    dirty: tabs.filter((t) => t.querySelector('.ed-tab-close.dirty') !== null).map((t) => (t.querySelector('.ed-tab-name')?.textContent ?? '').trim())
  };
})()`;
const DIALOG = `(() => {
  const modal = document.querySelector('.modal[role="alertdialog"]');
  if (!modal) return { open: false };
  return {
    open: true,
    title: modal.querySelector('.modal-title')?.textContent ?? null,
    buttons: Array.from(modal.querySelectorAll('.modal-actions button')).map((b) => (b.textContent ?? '').trim())
  };
})()`;
/** Press the dialog's real Cancel button, the way a click does. */
const CANCEL = `(() => {
  const modal = document.querySelector('.modal[role="alertdialog"]');
  if (!modal) return false;
  const b = Array.from(modal.querySelectorAll('.modal-actions button')).find((x) => (x.textContent ?? '').trim() === 'Cancel');
  if (!b) return false;
  b.click();
  return true;
})()`;
const monacoUp = `document.querySelector('.monaco-editor .view-lines') !== null`;
const noDialog = `document.querySelector('.modal[role="alertdialog"]') === null`;

async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(
        readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()
      );
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
          cdp = await wsConnect(t.webSocketDebuggerUrl, {
            collect: ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown']
          });
          const a = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' && typeof window.__gmuxP277 === 'object' ? location.href : null`,
            5000
          );
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
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}

const until = async (cdp, expr, ms) => {
  const s = Date.now();
  for (;;) {
    let v = null;
    try {
      v = await cdpEval(cdp, expr, 10000);
    } catch {
      v = null;
    }
    if (v === true) return true;
    if (Date.now() - s > ms) return false;
    await sleep(100);
  }
};
const untilDisk = async (path, pred, ms) => {
  const s = Date.now();
  for (;;) {
    if (pred(disk(path))) return true;
    if (Date.now() - s > ms) return false;
    await sleep(50);
  }
};
const drive = (cdp, spec) =>
  cdpEval(cdp, `window.__gmuxShotDrive(${J(spec)}).then(() => true)`, 180000);
const read = (cdp, expr) => cdpEval(cdp, expr, 20000);
const p277 = (cdp, call) => cdpEval(cdp, `${P277}.${call}`, 120000);
const p277Async = (cdp, call) => cdpEval(cdp, `${P277}.${call}.then((r) => r)`, 120000);
const tabOf = (reading, name) => reading?.tabs?.find((t) => t.name === name);

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------
/** Arms 1 to 3. An offered Settings choice, so no clamp can move it. */
const DELAY = 5000;
/** Arm 4. The longest delay Settings offers (AUTO_SAVE_DELAY_CHOICES). */
const LONG = 10_000;
/** How long after the last keystroke arm 4 changes the policy. */
const CHANGE_AFTER = 500;
/** Slack past arm 4's deadline before the file is read. */
const PAST_DEADLINE = 4000;

const findings = {};
/** Every arm's findings under its own name, so the report says which arm. */
const arms = {
  '1 the newer typing stays dirty (audit F1)': [],
  '2 it saves when permitted': [],
  '3 close still asks': [],
  '4 a timer does not outlive its policy (audit F2)': []
};
const [ARM1, ARM2, ARM3, ARM4] = Object.keys(arms);
/** Findings about the run itself rather than an arm: an agent the app resolved. */
const world = [];
let stage = 'launch';

/**
 * One arm 4 change, in ONE renderer turn chain so no CDP latency can land
 * between the keystroke and the change. `change` is JavaScript that assigns
 * `changed`. The editor is blurred BEFORE the change, while the mode is still
 * After a delay, which ignores a blur, so under On focus change there is no
 * focus left for a blur to take.
 */
async function policyArm(cdp, text, change) {
  const before = fileNow(NOTES);
  const got = await cdpEval(
    cdp,
    `(async () => {
      const d = ${P277};
      const id = ${J(NOTES)};
      const armed = await d.setPolicy('afterDelay', ${String(LONG)});
      const typed = await d.type(id, ${J(text)}, 0);
      const typedAt = performance.now();
      const el = document.activeElement;
      if (el !== null && typeof el.blur === 'function') el.blur();
      await new Promise((r) => setTimeout(r, ${String(CHANGE_AFTER)}));
      const focusedAtChange =
        document.activeElement !== null && document.activeElement.closest('.monaco-editor') !== null;
      let changed = null;
      ${change}
      return { armed, typed, changed, focusedAtChange, changedAfterMs: performance.now() - typedAt };
    })()`,
    120000
  );
  return { before, ...got };
}

/** The rows every arm 4 change shares, being its preconditions. */
function policyPreconditions(label, got, wantMode) {
  const typedTab = tabOf(got.typed, NAME);
  return grade([
    [`4${label} the timer was armed under After a delay`, [got.armed.mode, got.armed.delayMs], ['afterDelay', LONG]],
    [`4${label} the typing is in the buffer and dirty`, typedTab?.dirty ?? null, true],
    [`4${label} the mode read back after the change`, got.changed?.mode ?? null, wantMode],
    [`4${label} the change landed before the deadline`, got.changedAfterMs < LONG, true]
  ]);
}

await withElectron(
  {
    label: 'p277-save',
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 15 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(60000);
    say(`app window at ${url}, pid ${handle.appPid()}`);
    try {
      await cdp.call('Runtime.enable');
      const agents = standInsOnlyVerdict(JSON.parse(await cdpEval(cdp, AGENTS_LIST_EXPR, 90000)), {
        standIns: []
      });
      say(`agents: ${agents.ok ? 'ok' : 'NOT OK'}: ${agents.said}`);
      if (!agents.ok) world.push(`an agent resolved in the app's own scan: ${agents.said}`);
      for (;;) {
        if (
          (await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0
        ) {
          break;
        }
        await sleep(50);
      }

      stage = 'setup';
      await drive(cdp, { projectPath: project, editorWidth: 1100 });
      await sleep(800);
      await drive(cdp, { projectPath: project, openRel: NAME, mode: 'file' });
      // A MARKDOWN TAB OPENS RENDERED and a rendered tab has no Monaco under it.
      // The chip's own action puts it in Source, as in probe:p268.
      const sourced = await p277Async(cdp, `sourceMode(${J(NOTES)})`);
      await until(cdp, monacoUp, 20000);
      await sleep(600);
      const setup = grade([
        ['setup notes.md is in Source', tabOf(sourced, NAME)?.mode ?? null, 'file'],
        ['setup Monaco is mounted over it', await read(cdp, monacoUp), true]
      ]);
      arms[ARM1].push(...setup);

      // ----------------------------------------------------------- ARM 1
      // Off first, so `first edit` arms nothing and only the explicit save
      // below writes it.
      stage = 'arm 1';
      await p277Async(cdp, `setPolicy('off', ${String(DELAY)})`);
      const typedFirst = await p277Async(cdp, `type(${J(NOTES)}, ${J(FIRST)}, 0)`);
      // Switching auto save ON arms nothing for a tab that is already dirty
      // (SPEC S7), so no timer is waiting until the edit inside the save arms
      // one — and that timer is the one arm 2 needs to survive.
      const policyF1 = await p277Async(cdp, `setPolicy('afterDelay', ${String(DELAY)})`);

      // ARMS 1 AND 3 IN ONE RENDERER TURN CHAIN. The close has to be pressed
      // while the newer typing is unsaved, which is before the 5 s timer is
      // due, and a CDP round trip under load is not a number to bet that on.
      // The question is on screen the moment `closeTab` returns as far as the
      // scheduler is concerned (`blocked()` reads the store's confirm), so the
      // timer cannot write underneath the dialog while the DOM catches up.
      const heldRun = await cdpEval(
        cdp,
        `(async () => {
          const d = ${P277};
          const id = ${J(NOTES)};
          const readDialog = () => ${DIALOG};
          const readStrip = () => ${STRIP};
          const t0 = performance.now();
          const during = d.saveThenType(id, ${J(NEWER)});
          const settled = await d.settleSave();
          const settledMs = performance.now() - t0;
          const stripSettled = readStrip();
          const afterClose = d.closeTab(id);
          let dialog = readDialog();
          for (let i = 0; !dialog.open && i < 40; i += 1) {
            await new Promise((r) => setTimeout(r, 50));
            dialog = readDialog();
          }
          // One more beat so the strip under the question has drawn too.
          await new Promise((r) => setTimeout(r, 100));
          return {
            during,
            settled,
            settledMs,
            stripSettled,
            afterClose,
            dialog,
            strip: readStrip(),
            dialogMs: performance.now() - t0
          };
        })()`,
        120000
      );
      const diskAfterHeld = disk(NOTES);
      const settledTab = tabOf(heldRun.settled, NAME);
      findings['1'] = {
        typedFirst: tabOf(typedFirst, NAME),
        policy: [policyF1.mode, policyF1.delayMs],
        during: tabOf(heldRun.during, NAME),
        duringPending: heldRun.during.savePending,
        settled: settledTab,
        settledMs: heldRun.settledMs,
        stripSettled: heldRun.stripSettled,
        diskAfterHeld
      };
      say(`1: ${J(findings['1'])}`);
      arms[ARM1].push(
        ...grade([
          ['1 setup: the first edit is dirty before the save', tabOf(typedFirst, NAME)?.dirty ?? null, true],
          ['1 setup: auto save is After a delay at 5 s', [policyF1.mode, policyF1.delayMs], ['afterDelay', DELAY]],
          // NOT `during.savePending`: the drive sets it synchronously and no
          // promise can settle inside a synchronous call, so it reads true on
          // every build. The disk row in `newerStaysDirtyFindings` is the proof
          // the edit landed while the write was in the air.
          ['1 the edit was applied to the real buffer', tabOf(heldRun.during, NAME)?.value ?? null, NEWER_TEXT]
        ]),
        ...newerStaysDirtyFindings(settledTab, diskAfterHeld, {
          older: OLDER_TEXT,
          newer: NEWER_TEXT
        })
      );

      // ----------------------------------------------------------- ARM 3
      stage = 'arm 3';
      findings['3'] = {
        dialog: heldRun.dialog,
        strip: heldRun.strip,
        dialogMs: heldRun.dialogMs,
        storeConfirm: heldRun.afterClose.confirm,
        storeLabels: heldRun.afterClose.confirmLabels
      };
      arms[ARM3].push(...closeAsksFindings(heldRun.dialog, heldRun.strip, NAME));
      let cancelled = false;
      if (heldRun.dialog.open) {
        // The question being on screen wrote nothing.
        const diskUnderDialog = disk(NOTES);
        cancelled = (await read(cdp, CANCEL)) === true;
        const closedDialog = await until(cdp, noDialog, 8000);
        await sleep(300);
        const stripAfterCancel = await read(cdp, STRIP);
        const afterCancel = await p277(cdp, 'read()');
        findings['3'].diskUnderDialog = diskUnderDialog === OLDER_TEXT;
        findings['3'].cancelled = cancelled;
        findings['3'].stripAfterCancel = stripAfterCancel;
        findings['3'].tabAfterCancel = tabOf(afterCancel, NAME);
        arms[ARM3].push(
          ...grade([
            ['3 nothing was written while the question was on screen', diskUnderDialog === OLDER_TEXT, true],
            ['3 the real Cancel button was found and pressed', cancelled, true],
            ['3 the question went away', closedDialog, true],
            ['3 Cancel kept the tab on the strip', stripAfterCancel.names.includes(NAME), true],
            ['3 with its dirty dot', stripAfterCancel.dirty.includes(NAME), true],
            ['3 and the newer typing still in its buffer', tabOf(afterCancel, NAME)?.value ?? null, NEWER_TEXT]
          ])
        );
      }
      say(`3: ${J(findings['3'])}`);

      // ----------------------------------------------------------- ARM 2
      // Nothing is pressed. The timer the edit armed — re-armed once per
      // period while the question was up — is what has to write now.
      stage = 'arm 2';
      const savedReading = await p277Async(
        cdp,
        `awaitSaved(${J(NOTES)}, ${J(NEWER_TEXT)}, ${String(DELAY * 3 + 5000)})`
      );
      const landed = await untilDisk(NOTES, (d) => d === NEWER_TEXT, 4000);
      await sleep(400);
      const stripSaved = await read(cdp, STRIP);
      const dialogSaved = await read(cdp, DIALOG);
      const afterSave = await p277(cdp, 'read()');
      const savedTab = tabOf(afterSave, NAME);
      findings['2'] = {
        landed,
        onDisk: disk(NOTES),
        tab: savedTab,
        touchedBefore: settledTab?.touched ?? null,
        strip: stripSaved,
        dialog: dialogSaved.open,
        awaitedSaved: tabOf(savedReading, NAME)?.savedContents === NEWER_TEXT
      };
      say(`2: ${J(findings['2'])}`);
      arms[ARM2].push(
        ...grade([
          ['2 the file on disk is byte for byte the newer text', landed, true],
          ['2 the baseline moved to the newer text', savedTab?.savedContents ?? null, NEWER_TEXT],
          ['2 the tab went clean', savedTab?.dirty ?? null, false],
          ['2 the dot left the strip', stripSaved.dirty.includes(NAME), false],
          ['2 no question was raised by the write', dialogSaved.open, false],
          [
            "2 the write was auto save's own, not arm 1's explicit save",
            [settledTab?.touched ?? null, savedTab?.touched ?? null],
            [false, true]
          ]
        ])
      );

      // ----------------------------------------------------------- ARM 4
      stage = 'arm 4';
      // Reopened through the shot drive whatever arm 3 did, so a parent build
      // that closed the tab in silence still reaches this arm.
      await drive(cdp, { projectPath: project, openRel: NAME, mode: 'file' });
      await p277Async(cdp, `sourceMode(${J(NOTES)})`);
      await until(cdp, monacoUp, 20000);
      await sleep(500);

      // 4a. Off, through the settings store's update.
      const a = await policyArm(cdp, ' OFF', `changed = await d.setPolicy('off', ${String(LONG)});`);
      await sleep(LONG + PAST_DEADLINE);
      const aAfter = fileNow(NOTES);
      const aTab = tabOf(await p277(cdp, 'read()'), NAME);
      findings['4a'] = { ...a, typed: tabOf(a.typed, NAME), after: aAfter, tab: aTab };
      say(`4a: ${J({ changedAfterMs: a.changedAfterMs, mode: a.changed?.mode, unchanged: aAfter.text === a.before.text, mtimeSame: aAfter.mtime === a.before.mtime })}`);
      arms[ARM4].push(
        ...policyPreconditions('a', a, 'off'),
        ...unchangedFindings('a', a.before, aAfter),
        ...grade([['4a the typing is still held, dirty', aTab?.dirty ?? null, true]])
      );

      // 4b. On focus change, through the same call.
      const b = await policyArm(
        cdp,
        ' FOCUS',
        `changed = await d.setPolicy('onFocusChange', ${String(LONG)});`
      );
      await sleep(LONG + PAST_DEADLINE);
      const bAfter = fileNow(NOTES);
      const bTab = tabOf(await p277(cdp, 'read()'), NAME);
      findings['4b'] = { ...b, typed: tabOf(b.typed, NAME), after: bAfter, tab: bTab };
      say(`4b: ${J({ changedAfterMs: b.changedAfterMs, mode: b.changed?.mode, focused: b.focusedAtChange, unchanged: bAfter.text === b.before.text, mtimeSame: bAfter.mtime === b.before.mtime })}`);
      arms[ARM4].push(
        ...policyPreconditions('b', b, 'onFocusChange'),
        ...grade([['4b the editor held no focus, so no blur could write', b.focusedAtChange, false]]),
        ...unchangedFindings('b', b.before, bAfter),
        ...grade([['4b the typing is still held, dirty', bTab?.dirty ?? null, true]])
      );

      // 4c. Off, through File > Auto Save. The handler does not await its
      // update, so the change is read back by polling for the mode.
      const c = await policyArm(
        cdp,
        ' MENU',
        `d.menuAction('toggle-auto-save');
      changed = d.read();
      for (let i = 0; changed.mode !== 'off' && i < 40; i += 1) {
        await new Promise((r) => setTimeout(r, 50));
        changed = d.read();
      }`
      );
      await sleep(LONG + PAST_DEADLINE);
      const cAfter = fileNow(NOTES);
      const cTab = tabOf(await p277(cdp, 'read()'), NAME);
      findings['4c'] = { ...c, typed: tabOf(c.typed, NAME), after: cAfter, tab: cTab };
      say(`4c: ${J({ changedAfterMs: c.changedAfterMs, mode: c.changed?.mode, unchanged: cAfter.text === c.before.text, mtimeSame: cAfter.mtime === c.before.mtime })}`);
      arms[ARM4].push(
        ...policyPreconditions('c', c, 'off'),
        ...unchangedFindings('c', c.before, cAfter),
        ...grade([['4c the typing is still held, dirty', cTab?.dirty ?? null, true]])
      );

      // 4d. THE CONTROL. No change: the same delay must write, and it writes
      // every piece of typing the three changes above held back.
      const control = await policyArm(cdp, ' CONTROL', 'changed = d.read();');
      const controlValue = tabOf(control.typed, NAME)?.value ?? null;
      const controlLanded = await untilDisk(
        NOTES,
        (t) => controlValue !== null && t === controlValue,
        LONG + PAST_DEADLINE
      );
      findings['4d'] = {
        changedAfterMs: control.changedAfterMs,
        mode: control.changed?.mode,
        landed: controlLanded,
        held: ['OFF', 'FOCUS', 'MENU', 'CONTROL'].map((w) => disk(NOTES).includes(w))
      };
      say(`4d: ${J(findings['4d'])}`);
      arms[ARM4].push(
        ...policyPreconditions('d', control, 'afterDelay'),
        ...grade([
          ['4d CONTROL the same delay with no change wrote the buffer', controlLanded, true],
          ['4d CONTROL and the write holds every held word', findings['4d'].held, [true, true, true, true]]
        ])
      );
      stage = 'done';
    } catch (err) {
      const armName = Object.keys(arms).find((k) => k.startsWith(stage.replace('arm ', ''))) ?? ARM1;
      arms[armName].push(`the run stopped during ${stage}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      try {
        await cdpEval(
          cdp,
          `window.__gmuxShotCleanup ? window.__gmuxShotCleanup().then(() => true) : true`,
          30000
        );
      } catch {
        /* best effort; withElectron ends the tree anyway */
      }
      cdp.close();
    }
  }
);

writeFileSync(join(root, 'readings.json'), `${JSON.stringify({ findings, arms, world }, null, 2)}\n`);

let total = world.length;
for (const [name, list] of Object.entries(arms)) {
  total += list.length;
  if (list.length === 0) {
    say(`PASS  ${name}`);
  } else {
    say(`FAIL  ${name}`);
    for (const f of list) process.stderr.write(`${TAG}   ${f}\n`);
  }
}
for (const f of world) process.stderr.write(`${TAG} ${f}\n`);
if (total > 0) {
  process.stderr.write(`${TAG} FAILED: ${String(total)} finding(s).\n`);
  process.exit(1);
}
say('PASS: every arm behaved.');
process.exit(0);
