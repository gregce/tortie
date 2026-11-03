#!/usr/bin/env node
/**
 * probe-p268-autosave.mjs. THE PHASE 268 APP RUN: auto save, through the
 * guarded door, with a REAL concurrent writer (issue 24, research 122).
 *
 * ONE Electron on a scratch profile, a scratch HOME and this script's own tmux
 * socket, over one git project it builds inside its own scratch directory. It
 * spawns no agent, spends no token, opens no keychain and makes no request.
 * The "agent" is a `/bin/sh` this script runs that writes one file.
 *
 * ## What it proves, and why it has to be a run
 *
 * Research 122 states the danger first: `npm run conformance:save` exists
 * because of issue 16, where an agent's concurrent edit was SILENTLY
 * OVERWRITTEN and research 100 §1 measured the loss at 173 bytes of somebody's
 * paragraph — no toast, no banner, and a tab that went clean afterwards so
 * nothing was left to see. A timer that writes the buffer is that bug on a
 * loop. The gate reads the doors structurally; only a run reads what the timer
 * actually does to the bytes on disk. The arms:
 *
 *   A. IT SAVES. `afterDelay` at 1000 ms, type a word, and the file holds the
 *      typed bytes within 3 s with the dirty dot gone and NO dialog.
 *   B. IT DEBOUNCES. Ten characters 100 ms apart produce ONE distinct new
 *      content on disk, sampled at 50 ms, not ten.
 *   C. THE CONCURRENT WRITER — THE ARM THAT MATTERS. A `/bin/sh` writes 173
 *      bytes of "an agent's paragraph" into the file; then one character is
 *      typed in Tortie and five delay periods pass. The file on disk is
 *      BYTE-IDENTICAL to what the outsider wrote, the tab is STILL DIRTY,
 *      exactly ONE toast is on screen and it is the stop sentence, the stop
 *      record reads `stale`, and no further write lands in five more periods.
 *   D. THE STOP IS PER TAB. A second file in the same project still saves.
 *   E. ⌘S IS THE ONLY WAY FORWARD. The three-answer dialog appears with
 *      Compare as the confirm and Overwrite as the alt; Overwrite writes the
 *      buffer, the stop clears, and the next keystroke arms the timer again.
 *   F. PHASE 260'S PROMISE SURVIVES. A tab auto save has written is marked
 *      touched and is STILL ON THE STRIP after eleven more files are opened
 *      for keeps in that project, so the eviction did not take the tab whose
 *      journal and model the person is still using.
 *   G. THE SKIP LIST, ON DISK. A file OUTSIDE every project — the
 *      `~/.claude/CLAUDE.md` shape, inside the scratch HOME — is typed into
 *      with auto save on, and its mtime NEVER MOVES for ten delay periods.
 *      This is the proof that `fs:writeFile` is never reached on a timer.
 *   H. onFocusChange. Switch the mode, type, leave the editor: the file lands
 *      at the blur and not before.
 *   I. OFF IS OFF. Mode `off`, type, wait: the file never moves.
 *   J. THE MENU. The File > Auto Save action moves the mode off → afterDelay →
 *      off, through the same channel the row's click forwards to.
 *   K. NO AGENT RUNS. Every agent row the app would run for its version is
 *      renamed before the launch (build/hidden-agents.mjs) and the app's own
 *      scan is read back: nothing may resolve. The operator's own tmux server
 *      is not read here at all: since Phase 285 build/electron-run.mjs's census
 *      reads it around the launch, by identity, so a session he starts or ends
 *      while this runs is a note rather than a failure.
 *
 * ## SAFETY
 *
 * The Electron is started through build/electron-run.mjs, which ends the tree
 * it started in a `finally` block whatever happened, and the scratch tmux server
 * with it. The socket is handed in by build/harness-socket.mjs, which names it
 * `gmux-p268-<slug>-<pid>`, ends the server afterwards and unlinks its socket
 * and marker; `gmux` and `default` are refused by name. Every other process
 * this script starts is a synchronous `git` or `/bin/sh` that has exited before
 * the call returns. EVERY BYTE THIS
 * RUN WRITES is under `GMUX_HARNESS_DIR`. `--self-test` proves the grader on
 * fixtures and launches nothing.
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
const TAG = '[p268]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
 * The stop, judged. The tab must still be DIRTY, the record must read `stale`,
 * exactly ONE toast must be on screen, and it must be the stop sentence about
 * this file — never a second one per tick.
 */
export function stopFindings(tab, toasts, name) {
  const out = [];
  if (tab === undefined) return ['the tab is not on the strip at all'];
  out.push(
    ...grade([
      ['the tab is still dirty', tab.dirty, true],
      ['the stop record reads stale', tab.stopped, 'stale'],
      ['exactly one toast is on screen', toasts.length, 1]
    ])
  );
  const said = toasts[0] ?? '';
  if (!said.includes(`'${name}' changed on disk`)) {
    out.push(`the toast does not name the file's change on disk: ${JSON.stringify(said)}`);
  }
  if (!said.includes('stopped saving it on its own')) {
    out.push(`the toast does not say auto save stopped: ${JSON.stringify(said)}`);
  }
  return out;
}

/**
 * How many DISTINCT contents a sampler saw after the first. A debounce that is
 * really a save-per-keystroke shows up here and nowhere else.
 */
export function distinctAfterFirst(samples) {
  const seen = [];
  for (const s of samples) {
    if (seen[seen.length - 1] !== s) seen.push(s);
  }
  return Math.max(0, seen.length - 1);
}

function selfTest() {
  const fixtures = [
    ['a clean grade is empty', () => grade([['x', 1, 1]]), []],
    [
      'a disagreement is named',
      () => grade([['x', 1, 2]]),
      ['x: 1 want 2']
    ],
    [
      'a stop that behaved has no findings',
      () =>
        stopFindings(
          { dirty: true, stopped: 'stale' },
          ["'notes.md' changed on disk, so nothing was written. Tortie stopped saving it on its own — press ⌘S when you are ready."],
          'notes.md'
        ),
      []
    ],
    [
      'a tab that went CLEAN after the refusal is caught — this is issue 16 itself',
      () =>
        stopFindings(
          { dirty: false, stopped: 'stale' },
          ["'notes.md' changed on disk, so nothing was written. Tortie stopped saving it on its own — press ⌘S when you are ready."],
          'notes.md'
        ),
      ['the tab is still dirty: false want true']
    ],
    [
      'a second toast is caught',
      () =>
        stopFindings({ dirty: true, stopped: 'stale' }, ['a', 'b'], 'notes.md').length,
      3
    ],
    [
      'no stop record at all is caught',
      () =>
        stopFindings(
          { dirty: true, stopped: null },
          ["'notes.md' changed on disk, so nothing was written. Tortie stopped saving it on its own — press ⌘S when you are ready."],
          'notes.md'
        ),
      ['the stop record reads stale: null want "stale"']
    ],
    ['one debounced write reads as one', () => distinctAfterFirst(['a', 'a', 'ab', 'ab']), 1],
    ['ten writes read as ten', () => distinctAfterFirst(['a', 'ab', 'abc', 'abcd']), 3],
    ['a file that never moved reads as zero', () => distinctAfterFirst(['a', 'a', 'a']), 0]
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
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p268', `node ${process.argv[1]}`],
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
// The scratch world: one git project, plus a file OUTSIDE every project.
// ---------------------------------------------------------------------------
mkdirSync(join(harnessDir, 'p268'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p268'));
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
writeHiddenAgents(profile, 'p268', hiddenAgentsBesides([]));
// The ~/.claude/CLAUDE.md shape, inside the SCRATCH home and outside every
// project root. Arm G types into it and watches its mtime never move.
const outsideDir = join(home, '.claude');
mkdirSync(outsideDir, { recursive: true });
const OUTSIDE = join(outsideDir, 'CLAUDE.md');

const git = (cwd, ...a) => {
  const r = spawnSync('git', a, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
  });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
/** A plain shell writes the file from outside, which is what an agent's write is. */
const shellWrite = (path, text) => {
  const r = spawnSync('/bin/sh', ['-c', 'cat > "$1"', 'sh', path], {
    input: text,
    encoding: 'utf8'
  });
  if (r.status !== 0) throw new Error('shell write failed');
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

const NOTES_V1 = 'The notes begin here.\n\nA second line of notes.\n';
const OTHER_V1 = 'The other file begins here.\n';
const OUTSIDE_V1 = '# Global instructions\n\nA line an agent writes too.\n';
/**
 * 173 bytes, being research 100 §1's own measurement of what issue 16
 * destroyed. The number is the point: it is the size of the loss this whole
 * phase exists not to repeat.
 */
const AGENT_PARAGRAPH =
  'An agent wrote this paragraph while the person was typing in the same file, and every byte of it has to survive the timer that is about to fire underneath it, or the phase failed.\n';

writeFileSync(join(project, 'notes.md'), NOTES_V1);
writeFileSync(join(project, 'other.md'), OTHER_V1);
for (let i = 0; i < 12; i += 1) {
  writeFileSync(join(project, `f${String(i)}.md`), `# f${String(i)}\n\nA paragraph.\n`);
}
writeFileSync(OUTSIDE, OUTSIDE_V1);
git(project, 'init', '-q', '-b', 'main');
git(project, 'config', 'user.email', 'p268@example.invalid');
git(project, 'config', 'user.name', 'p268');
git(project, 'add', '.');
git(project, 'commit', '-q', '-m', 'first');

const NOTES = join(project, 'notes.md');
const OTHER = join(project, 'other.md');

say(`the agent paragraph is ${String(Buffer.byteLength(AGENT_PARAGRAPH, 'utf8'))} bytes`);

// ---------------------------------------------------------------------------
// Readers.
// ---------------------------------------------------------------------------
const P268 = 'window.__gmuxP268';
const STRIP = `(() => {
  const tabs = Array.from(document.querySelectorAll('.ed-tab'));
  return {
    names: tabs.map((t) => (t.querySelector('.ed-tab-name')?.textContent ?? '').trim()),
    active: (document.querySelector('.ed-tab.active .ed-tab-name')?.textContent ?? '').trim() || null,
    dirty: tabs.filter((t) => t.querySelector('.ed-tab-close.dirty') !== null).map((t) => (t.querySelector('.ed-tab-name')?.textContent ?? '').trim())
  };
})()`;
const DIALOG = `(() => {
  const modal = document.querySelector('.modal[role="alertdialog"]');
  if (!modal) return { open: false };
  const buttons = Array.from(modal.querySelectorAll('.modal-actions button'));
  return {
    open: true,
    title: modal.querySelector('.modal-title')?.textContent ?? null,
    buttons: buttons.map((b) => (b.textContent ?? '').trim()),
    focused: ((document.activeElement && document.activeElement.textContent) || '').trim()
  };
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
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' && typeof window.__gmuxP268 === 'object' ? location.href : null`,
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
  cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 180000);
const read = (cdp, expr) => cdpEval(cdp, expr, 20000);
const p268 = (cdp, call) => cdpEval(cdp, `${P268}.${call}`, 120000);
const p268Async = (cdp, call) =>
  cdpEval(cdp, `${P268}.${call}.then((r) => r)`, 120000);
const tabOf = (reading, name) => reading.tabs.find((t) => t.name === name);

/** Sample one file's contents every 50 ms for `ms`, with no app involvement. */
async function sampleDisk(path, ms) {
  const out = [];
  const until_ = Date.now() + ms;
  while (Date.now() < until_) {
    out.push(disk(path));
    await sleep(50);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------
const findings = {};
const problems = [];
const DELAY = 1000;
/** Five delay periods, plus slack for one IPC round trip each. */
const FIVE = DELAY * 5 + 1500;

await withElectron(
  {
    label: 'p268-autosave',
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 20 * 60 * 1000
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
      if (!agents.ok) problems.push(`K an agent resolved in the app's own scan: ${agents.said}`);
      // ARM H NEEDS THIS. Monaco's focus tracker is driven by real `focus` and
      // `blur` EVENTS on its hidden input, and Chromium suppresses those for a
      // document it does not consider focused — which a probe's window is not.
      // Without it `document.activeElement` moves, the editor never believes it
      // was focused, and `onDidBlurEditorWidget` never fires, so the arm reads
      // "nothing landed at the blur" about a listener that was never asked.
      // Measured here at this phase's build, over four runs.
      try {
        await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true });
      } catch {
        say('focus emulation is unavailable; arm H may not see a blur');
      }
      for (;;) {
        if (
          (await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0
        ) {
          break;
        }
        await sleep(50);
      }

      await drive(cdp, { projectPath: project, editorWidth: 1100 });
      await sleep(800);

      // ------------------------------------------------------------- ARM I
      // Off is off, measured FIRST, because off is what ships.
      await drive(cdp, { projectPath: project, openRel: 'notes.md', mode: 'file' });
      // A MARKDOWN TAB OPENS RENDERED whatever the request asked for, and a
      // rendered tab has no Monaco under it. The chip's own action puts it in
      // Source, which is what a person editing prose does first.
      const sourced = await p268Async(cdp, `sourceMode(${JSON.stringify(NOTES)})`);
      await until(cdp, monacoUp, 20000);
      await sleep(600);
      problems.push(
        ...grade([
          ['setup notes.md is in Source', tabOf(sourced, 'notes.md')?.mode ?? null, 'file'],
          ['setup Monaco is mounted over it', sourced.monaco, true]
        ])
      );
      const offPolicy = await p268Async(cdp, `setPolicy('off', ${String(DELAY)})`);
      const mtimeBefore = mtime(NOTES);
      await p268Async(cdp, `type(${JSON.stringify(NOTES)}, 'X', 60)`);
      await sleep(FIVE);
      const offReading = await p268(cdp, 'read()');
      findings.I = {
        mode: offPolicy.mode,
        onDisk: disk(NOTES) === NOTES_V1,
        mtimeMoved: mtime(NOTES) !== mtimeBefore,
        dirty: tabOf(offReading, 'notes.md')?.dirty ?? null
      };
      say(`I: ${JSON.stringify(findings.I)}`);
      problems.push(
        ...grade([
          ['I the shipped mode is off', offPolicy.mode, 'off'],
          ['I the file was never written', findings.I.onDisk, true],
          ['I its mtime never moved', findings.I.mtimeMoved, false],
          ['I the tab is dirty and stayed that way', findings.I.dirty, true]
        ])
      );

      // The 'X' stays in the buffer on purpose: arm A asks whether the WORD it
      // types reaches disk, not what else is in the file, and an undo here
      // would need the editor to hold focus, which is a second thing to get
      // right for no reading.

      // ------------------------------------------------------------- ARM A
      // It saves.
      await p268Async(cdp, `setPolicy('afterDelay', ${String(DELAY)})`);
      await p268Async(cdp, `type(${JSON.stringify(NOTES)}, 'PERSON', 60)`);
      const landed = await untilDisk(NOTES, (d) => d.includes('PERSON'), 3000);
      await sleep(300);
      const afterA = await p268(cdp, 'read()');
      const dialogA = await read(cdp, DIALOG);
      findings.A = {
        landed,
        dirty: tabOf(afterA, 'notes.md')?.dirty ?? null,
        stopped: tabOf(afterA, 'notes.md')?.stopped ?? null,
        dialog: dialogA.open,
        strip: (await read(cdp, STRIP)).dirty
      };
      say(`A: ${JSON.stringify(findings.A)}`);
      problems.push(
        ...grade([
          ['A the typed bytes reached the disk within 3 s', landed, true],
          ['A the tab went clean', findings.A.dirty, false],
          ['A no dialog appeared', dialogA.open, false],
          ['A no stop was recorded', findings.A.stopped, null],
          ['A the dot is off the strip', findings.A.strip, []]
        ])
      );

      // ------------------------------------------------------------- ARM B
      // It debounces: ten characters 100 ms apart, sampled at 50 ms.
      await p268Async(cdp, `sourceMode(${JSON.stringify(NOTES)})`);
      const sampling = sampleDisk(NOTES, 10 * 100 + FIVE);
      await p268Async(cdp, `type(${JSON.stringify(NOTES)}, 'abcdefghij', 100)`);
      const samples = await sampling;
      const writes = distinctAfterFirst(samples);
      findings.B = { writes, samples: samples.length, tail: disk(NOTES).includes('abcdefghij') };
      say(`B: ${JSON.stringify(findings.B)}`);
      problems.push(
        ...grade([
          ['B ten keystrokes produced ONE write', writes, 1],
          ['B and the one write holds every character', findings.B.tail, true]
        ])
      );

      // ------------------------------------------------------------- ARM C
      // THE CONCURRENT WRITER. This is the arm the phase exists for.
      await p268Async(cdp, `sourceMode(${JSON.stringify(NOTES)})`);
      await p268(cdp, 'clearToasts()');
      shellWrite(NOTES, AGENT_PARAGRAPH);
      const outsiderBytes = disk(NOTES);
      await p268Async(cdp, `type(${JSON.stringify(NOTES)}, 'Z', 0)`);
      await sleep(FIVE);
      const afterC = await p268(cdp, 'read()');
      const dialogC = await read(cdp, DIALOG);
      const heldAfterFive = disk(NOTES);
      await sleep(FIVE);
      const heldAfterTen = disk(NOTES);
      const afterC2 = await p268(cdp, 'read()');
      findings.C = {
        bytesKept: heldAfterFive === outsiderBytes,
        bytesStillKept: heldAfterTen === outsiderBytes,
        outsiderLength: Buffer.byteLength(outsiderBytes, 'utf8'),
        tab: tabOf(afterC, 'notes.md'),
        toasts: afterC.toasts,
        toastsLater: afterC2.toasts.length,
        dialog: dialogC.open
      };
      say(`C: ${JSON.stringify(findings.C)}`);
      problems.push(
        ...grade([
          ["C the outsider's bytes are untouched", findings.C.bytesKept, true],
          ['C and still untouched five periods later', findings.C.bytesStillKept, true],
          ['C no dialog was opened by the timer', dialogC.open, false],
          ['C still exactly one toast after ten periods', findings.C.toastsLater, 1]
        ]),
        ...stopFindings(tabOf(afterC, 'notes.md'), afterC.toasts, 'notes.md').map(
          (f) => `C ${f}`
        )
      );

      // ------------------------------------------------------------- ARM D
      // The stop is PER TAB.
      await drive(cdp, { projectPath: project, openRel: 'other.md', mode: 'file' });
      await p268Async(cdp, `sourceMode(${JSON.stringify(OTHER)})`);
      await until(cdp, monacoUp, 20000);
      await sleep(500);
      await p268Async(cdp, `type(${JSON.stringify(OTHER)}, 'STILL', 60)`);
      const otherLanded = await untilDisk(OTHER, (d) => d.includes('STILL'), 4000);
      const afterD = await p268(cdp, 'read()');
      findings.D = {
        otherLanded,
        other: tabOf(afterD, 'other.md'),
        notesStillStopped: tabOf(afterD, 'notes.md')?.stopped ?? null
      };
      say(`D: ${JSON.stringify(findings.D)}`);
      problems.push(
        ...grade([
          ['D the second file still auto saves', otherLanded, true],
          ['D and records no stop of its own', findings.D.other?.stopped ?? null, null],
          ['D while the first is still stopped', findings.D.notesStillStopped, 'stale']
        ])
      );

      // ------------------------------------------------------------- ARM E
      // ⌘S is the only way forward, and its dialog is unchanged.
      await p268Async(cdp, `sourceMode(${JSON.stringify(NOTES)})`);
      await p268Async(cdp, `explicitSave(${JSON.stringify(NOTES)})`);
      const dialogE = await read(cdp, DIALOG);
      // The DEFAULT is read from the store's own ConfirmSpec rather than from
      // `document.activeElement`, which the dialog fills in a frame later and
      // which a probe reads as an empty string if it looks too early.
      const specE = (await p268(cdp, 'read()')).confirmLabels;
      findings.E = { dialog: dialogE, spec: specE };
      say(`E: ${JSON.stringify(findings.E)}`);
      problems.push(
        ...grade([
          ['E the explicit save asks', dialogE.open, true],
          ['E the title names the file', dialogE.title, "'notes.md' changed on disk"],
          ['E three answers, Overwrite leading and Compare last', dialogE.buttons, ['Overwrite', 'Cancel', 'Compare']],
          ['E Compare is the confirm, so the default is not Overwrite', specE?.confirm ?? null, 'Compare'],
          ['E Overwrite is the alt', specE?.alt ?? null, 'Overwrite']
        ])
      );
      await p268(cdp, 'pressOverwrite()');
      const wroteThrough = await untilDisk(NOTES, (d) => d.includes('Z'), 8000);
      await until(cdp, noDialog, 8000);
      await sleep(400);
      const afterE = await p268(cdp, 'read()');
      // The next keystroke must arm the timer again.
      await p268Async(cdp, `type(${JSON.stringify(NOTES)}, 'AGAIN', 60)`);
      const armedAgain = await untilDisk(NOTES, (d) => d.includes('AGAIN'), 4000);
      findings.E2 = {
        wroteThrough,
        stopCleared: tabOf(afterE, 'notes.md')?.stopped ?? null,
        armedAgain
      };
      say(`E2: ${JSON.stringify(findings.E2)}`);
      problems.push(
        ...grade([
          ['E Overwrite wrote the buffer', wroteThrough, true],
          ['E the stop cleared with it', findings.E2.stopCleared, null],
          ['E and the next keystroke armed the timer again', armedAgain, true]
        ])
      );

      // ------------------------------------------------------------- ARM F
      // Phase 260's promise: a tab auto save WROTE is not the eviction's prey.
      const beforeF = await p268(cdp, 'read()');
      const touched = tabOf(beforeF, 'notes.md')?.touched ?? null;
      // `openRels` is the shot drive's own "for keeps" open, which is what an
      // eleventh file arriving in this project looks like.
      await drive(cdp, {
        projectPath: project,
        openRels: Array.from({ length: 11 }, (_, i) => `f${String(i)}.md`),
        openRel: 'f11.md',
        mode: 'file'
      });
      await sleep(900);
      const stripF = await read(cdp, STRIP);
      findings.F = { touched, names: stripF.names, held: stripF.names.includes('notes.md') };
      say(`F: ${JSON.stringify(findings.F)}`);
      problems.push(
        ...grade([
          ['F auto save marked the tab written', touched, true],
          ['F and the eleventh open did not evict it', findings.F.held, true]
        ])
      );

      // ------------------------------------------------------------- ARM G
      // THE SKIP LIST, ON DISK. A file outside every project, typed into with
      // auto save on, must never be written by the timer.
      const openedOutside = await p268Async(
        cdp,
        `openOutside(${JSON.stringify(project)}, ${JSON.stringify(OUTSIDE)})`
      );
      await until(cdp, monacoUp, 20000);
      await sleep(600);
      const outsideBefore = mtime(OUTSIDE);
      const outsideTextBefore = disk(OUTSIDE);
      const outsideOpened = openedOutside.tabs.some((t) => t.path === OUTSIDE);
      if (outsideOpened) {
        await p268Async(cdp, `type(${JSON.stringify(OUTSIDE)}, 'TYPED', 60)`);
        await sleep(DELAY * 10 + 2000);
      }
      const afterG = await p268(cdp, 'read()');
      findings.G = {
        opened: outsideOpened,
        mtimeMoved: mtime(OUTSIDE) !== outsideBefore,
        textMoved: disk(OUTSIDE) !== outsideTextBefore,
        dirty: afterG.tabs.find((t) => t.path === OUTSIDE)?.dirty ?? null,
        stopped: afterG.tabs.find((t) => t.path === OUTSIDE)?.stopped ?? null
      };
      say(`G: ${JSON.stringify(findings.G)}`);
      problems.push(
        ...grade([
          ['G the out-of-project file opened as a tab', outsideOpened, true],
          ['G its mtime never moved in ten delay periods', findings.G.mtimeMoved, false],
          ['G nor did its text', findings.G.textMoved, false],
          ['G the tab is still dirty, so the buffer kept the typing', findings.G.dirty, true],
          ['G and nothing was said about it — it is skipped, not refused', findings.G.stopped, null]
        ])
      );

      // ------------------------------------------------------------- ARM H
      // onFocusChange: the file lands at the blur, not before.
      await p268Async(cdp, `setPolicy('onFocusChange', ${String(DELAY)})`);
      await drive(cdp, { projectPath: project, openRel: 'other.md', mode: 'file' });
      await p268Async(cdp, `sourceMode(${JSON.stringify(OTHER)})`);
      await until(cdp, monacoUp, 20000);
      await sleep(500);
      const focused = await p268(cdp, 'focusEditor()');
      await p268Async(cdp, `type(${JSON.stringify(OTHER)}, 'BLUR', 60)`);
      await sleep(DELAY * 3);
      const beforeBlur = disk(OTHER).includes('BLUR');
      const armed = await p268(cdp, 'read()');
      const blurred = await p268(cdp, 'blur()');
      const afterBlur = await untilDisk(OTHER, (d) => d.includes('BLUR'), 5000);
      findings.H = {
        mode: armed.mode,
        confirm: armed.confirm,
        stopped: tabOf(blurred, 'other.md')?.stopped ?? null,
        toasts: blurred.toasts,
        dirty: tabOf(armed, 'other.md')?.dirty ?? null,
        focusedBefore: focused.editorFocused,
        stillFocusedAtBlur: armed.editorFocused,
        focusedAfter: blurred.editorFocused,
        beforeBlur,
        afterBlur
      };
      say(`H: ${JSON.stringify(findings.H)}`);
      problems.push(
        ...grade([
          ['H the mode is onFocusChange', findings.H.mode, 'onFocusChange'],
          ['H the tab is dirty and waiting', findings.H.dirty, true],
          ['H the editor really held focus when the blur was sent', findings.H.stillFocusedAtBlur, true],
          ['H and lost it', findings.H.focusedAfter, false],
          ['H nothing was written while the editor still had focus', beforeBlur, false],
          ['H and it landed at the blur', afterBlur, true]
        ])
      );

      // ------------------------------------------------------------- ARM J
      // The menu action, through the channel the row's click forwards to.
      const offAgain = await p268Async(cdp, `setPolicy('off', ${String(DELAY)})`);
      const before = offAgain.mode;
      await p268(cdp, `menuAction('toggle-auto-save')`);
      await sleep(700);
      const once = (await p268(cdp, 'read()')).mode;
      await p268(cdp, `menuAction('toggle-auto-save')`);
      await sleep(700);
      const twice = (await p268(cdp, 'read()')).mode;
      findings.J = { before, once, twice };
      say(`J: ${JSON.stringify(findings.J)}`);
      problems.push(
        ...grade([
          ['J it starts off', before, 'off'],
          ['J one toggle turns it on, after a delay', once, 'afterDelay'],
          ['J and a second turns it off again', twice, 'off']
        ])
      );
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

writeFileSync(join(root, 'readings.json'), `${JSON.stringify(findings, null, 2)}\n`);
if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(problems.length)} finding(s).\n`);
  process.exit(1);
}
say('PASS: every arm behaved.');
process.exit(0);
