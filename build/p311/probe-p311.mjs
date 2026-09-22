#!/usr/bin/env node
/**
 * probe:p311 — the app run Phase 311 owes, and the row a person actually sees.
 *
 * WHY IT EXISTS. The phase's claim is about what a blocked row SAYS. A blocked
 * row said `needs input` and beside it drew the last inked line of the session's
 * screen, which for every committed Claude dialog is the hint row — `Esc to
 * cancel · Tab to amend` — while the question the agent asked sat five lines
 * above it. That is a claim about a drawn rectangle, so it is measured here
 * rather than asserted anywhere: one Electron, the shipping hook route, the
 * shipping composition, the shipping channel and the drawn DOM.
 *
 * WHAT IS REAL IN A RUN
 *   - The project, the session, the manifest record, the per-session hook
 *     settings file Tortie writes at <userData>/gmux/hooks/claude/<id>.json,
 *     the loopback hook server, its 128-bit token, the composition in
 *     src/main/activity/question.ts, the activity channel and the row.
 *   - The body is POSTed to the app's own route with the app's own token, read
 *     out of the settings file the app itself wrote. Nothing on that path is
 *     stubbed, and the route is the one `claude --settings <path>` names.
 *
 * WHAT IS SUPPLIED, and it is exactly one thing: the `claude` on the scratch
 * PATH is a nine line /bin/sh script this probe writes. It prints the COMMITTED
 * fixture src/main/activity/__tests__/fixtures/claude-permission-prompt.txt and
 * waits, so the screen half of every reading is the tree's own bytes. NO VENDOR
 * PROCESS RUNS AND NO TOKEN IS SPENT. `detectDialog` reaches `needs_input`
 * through the shipped inferred tier, exactly as it does for a real dialog.
 *
 * THE ARMS
 *   A  the ⌘J row BEFORE any hook body — the parent reading, taken live
 *   B  the ⌘J row AFTER a real PermissionRequest — the phase's whole claim
 *   C  the rectangle: ONE line, tail-truncated, at the shipped width, and the
 *      whole of the question reachable in the row's own label (the fix round's
 *      repair, because the drawn span holds about twenty characters of it)
 *   D  Catch Me Up, same session: the outcome sentence and the question under it
 *   E  the cap: a 600 character tool_input draws at most QUESTION_MAX, one line
 *   F  redaction, on the drawn row: a token-shaped body draws no token shape
 *   G  the clear: the dialog leaves, a DIFFERENT committed dialog arrives with
 *      NO hook body, and the row draws that screen's own last inked line
 *   H  a control shell row in the same project, drawn before and after
 *   I  app.log afterwards, which must contain no byte of any body
 *   J  reporting only: the pane dies and the session is restored under the same
 *      id. Whether a restored session reaches `needs_input` from inert history
 *      is not this phase's to decide, so this arm PRINTS what it read and never
 *      fails the run. The deterministic pin for a question outliving a forget is
 *      src/main/activity/__tests__/p311-question.test.ts, over the shipping
 *      monitor.
 *
 * WHAT IT REFUSES TO DO. It signals nothing itself: every launch goes through
 * build/electron-run.mjs's `withElectron`, whose kill is in a `finally`, and it
 * names its own scratch tmux socket so the same teardown ends that too. It never
 * names `-L gmux`. It installs nothing, spends no token, writes nothing under
 * the person's home, and reads no file of theirs. `npm run shot` is not called.
 *
 * BUILD FIRST. It carries no `npm run build &&` on purpose, because a run
 * against another checkout must not rebuild this one, and it refuses (exit 2)
 * when the checkout it is pointed at has no build.
 *
 * IT NEEDS NO `harness-socket.mjs` WRAPPER, and that is deliberate rather than
 * an oversight: it composes its own socket name from its own pid, hands it to
 * `withElectron`, and that helper ends the server in the same `finally` that
 * ends the app. One teardown, one place, and no second contract to keep.
 *
 *   npm run -s probe:p311
 *   P311_CHECKOUT=/path/to/parent npm run -s probe:p311   the parent reading
 *   P311_KEEP=1 npm run -s probe:p311                     keep the scratch world
 *
 * Exit 0 when every arm passed, 1 when an arm failed, 2 when it could not run.
 */

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { wsConnect, cdpEval } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
/** The checkout whose APP is launched. The helper is always this tree's. */
const CHECKOUT = resolve((process.env['P311_CHECKOUT'] ?? '').trim() || ROOT);
const TAG = `[p311 ${CHECKOUT === ROOT ? 'head' : 'other'}]`;
const say = (line) => console.log(`${TAG} ${line}`);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const J = JSON.stringify;

if (!existsSync(join(CHECKOUT, 'out', 'main', 'index.js'))) {
  console.error(
    `${TAG} ${CHECKOUT} has no build at out/main/index.js. Run npm run build there first.`
  );
  process.exit(2);
}

/**
 * The drawn cap, read out of the leaf rather than copied, so the cap arm cannot
 * drift from the number the app actually applies.
 */
const QUESTION_MAX = (() => {
  const leaf = join(CHECKOUT, 'src/main/activity/question.ts');
  if (!existsSync(leaf)) return 0;
  const hit = /QUESTION_MAX\s*=\s*(\d+)/.exec(readFileSync(leaf, 'utf8'));
  return hit === null ? 0 : Number(hit[1]);
})();
if (QUESTION_MAX <= 0) {
  console.error(`${TAG} could not read QUESTION_MAX out of ${CHECKOUT}'s leaf`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// The scratch world. Outside the repository and outside the person's home,
// which is what build/electron-run.mjs refuses a profile for.
// ---------------------------------------------------------------------------

const RUN = resolve(
  (process.env['P311_RUN'] ?? '').trim() || `/private/tmp/p311-probe-${process.pid}`
);
const HOME = join(RUN, 'home');
const PROFILE = join(RUN, 'profile');
const PROJECT = join(RUN, 'project');
const BIN = join(HOME, '.local', 'bin');
const SOCKET = `gmux-p311-${process.pid}`;

/** The two committed dialogs. The second one fires no hook, which is arm G. */
const FIXTURES = join(CHECKOUT, 'src/main/activity/__tests__/fixtures');
const DIALOG_ONE = join(FIXTURES, 'claude-permission-prompt.txt');
const DIALOG_TWO = join(FIXTURES, 'claude-workspace-trust.txt');
for (const file of [DIALOG_ONE, DIALOG_TWO]) {
  if (existsSync(file)) continue;
  console.error(`${TAG} no fixture at ${file}`);
  process.exit(2);
}

/**
 * What `excerptFromCapture` returns for a fixture: its last inked line, clipped
 * where `EXCERPT_MAX` clips.
 *
 * Re-derived here rather than imported, because this file is `.mjs` and that one
 * is TypeScript — and because a second method is the point: it is what makes arm
 * A a MEASUREMENT of the parent reading rather than a restatement of it. Checked
 * against the shipping `excerptFromCapture` over both committed fixtures: it
 * answers `Esc to cancel · Tab to amend` and `Enter to confirm · Esc to cancel`,
 * the same two strings, which is also what the entry says.
 */
const EXCERPT_MAX = 120;
function lastInkedLine(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const text = lines[i].replace(/\s+$/, '').trim();
    if (text !== '') return text.slice(0, EXCERPT_MAX);
  }
  return '';
}
const HINT_ONE = lastInkedLine(DIALOG_ONE);
const HINT_TWO = lastInkedLine(DIALOG_TWO);

rmSync(RUN, { recursive: true, force: true });
for (const dir of [HOME, PROFILE, PROJECT, BIN, join(HOME, '.claude')]) {
  mkdirSync(dir, { recursive: true });
}

const SCREEN_ONE = join(RUN, 'screen-one.txt');
const SCREEN_TWO = join(RUN, 'screen-two.txt');
writeFileSync(SCREEN_ONE, readFileSync(DIALOG_ONE));
writeFileSync(SCREEN_TWO, readFileSync(DIALOG_TWO));
/** The two files the fake claude waits on, so the probe owns the timing. */
const STEP_QUIET = join(RUN, 'step-quiet');
const STEP_SECOND = join(RUN, 'step-second');
const STEP_EXIT = join(RUN, 'step-exit');
const SIDFILE = join(RUN, 'session-id');

/**
 * The conversation store Catch Me Up reads. Two lines of the committed research
 * 63 claude fixture, so the newest turn runs off the end of the file — a user
 * ask with no answer and no interrupt, which is the ONE row shape whose outcome
 * sentence this phase moves.
 */
const STORE_SRC = join(
  CHECKOUT,
  'docs/research/assets/63-fixtures/claude-session.jsonl'
);
const STORE = join(RUN, 'store-template.jsonl');
if (existsSync(STORE_SRC)) {
  const lines = readFileSync(STORE_SRC, 'utf8').trim().split('\n').slice(0, 2);
  writeFileSync(STORE, `${lines.join('\n')}\n`);
}

// The fake claude. /bin/sh, nine lines of work, and no vendor code.
const FAKE = join(BIN, 'claude');
writeFileSync(
  FAKE,
  `#!/bin/sh
case "$1" in
  -v|--version) echo "2.1.238 (Claude Code)"; exit 0;;
esac
sid=""
prev=""
for a in "$@"; do
  if [ "$prev" = "--session-id" ]; then sid="$a"; fi
  prev="$a"
done
if [ -n "$sid" ] && [ -n "$P311_STORE" ] && [ -f "$P311_STORE" ]; then
  slug=$(printf '%s' "$PWD" | sed 's|/|-|g')
  d="$HOME/.claude/projects/$slug"
  mkdir -p "$d"
  sed -e "s|11111111-2222-4333-8444-555555555555|$sid|g" \\
      -e "s|/Users/dev/demo-app|$PWD|g" "$P311_STORE" > "$d/$sid.jsonl"
  echo "$sid" > "$P311_SIDFILE"
fi
cat "$P311_SCREEN_ONE"
while [ ! -f "$P311_STEP_QUIET" ]; do sleep 1; done
printf '\\033[2J\\033[H'
echo "p311 nothing is being asked here"
while [ ! -f "$P311_STEP_SECOND" ]; do sleep 1; done
printf '\\033[2J\\033[H'
cat "$P311_SCREEN_TWO"
while [ ! -f "$P311_STEP_EXIT" ]; do sleep 1; done
exit 0
`,
  'utf8'
);
chmodSync(FAKE, 0o755);

// tmux's execvp reads the LOGIN shell's PATH, so the scratch bin goes on it.
writeFileSync(join(HOME, '.zprofile'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
writeFileSync(join(HOME, '.zshrc'), `export PATH="${BIN}:$PATH"\n`, 'utf8');

const git = (args) =>
  spawnSync('git', args, {
    cwd: PROJECT,
    encoding: 'utf8',
    env: { ...process.env, HOME }
  });
git(['init', '-q']);
writeFileSync(join(PROJECT, 'note.txt'), 'hello\n');
git(['add', '-A']);
git(['-c', 'user.email=p@x', '-c', 'user.name=p', 'commit', '-qm', 'seed']);

// ---------------------------------------------------------------------------
// The bodies. Every marker is a word that appears nowhere else on the machine,
// so arm I's scan of app.log is exact rather than approximate.
// ---------------------------------------------------------------------------

const MARK = `zqp311${randomBytes(3).toString('hex')}`;
const BODY_ONE = J({
  session_id: 'irrelevant',
  hook_event_name: 'PermissionRequest',
  tool_name: 'Bash',
  tool_input: {
    command: `rm -rf build ${MARK}`,
    description: `secretplan${MARK} that must never be logged`
  }
});
const LONG_SEGMENT = 'deeply-nested-directory-name';
const BODY_LONG = J({
  tool_name: 'Edit',
  tool_input: { file_path: `/private/tmp/${`${LONG_SEGMENT}/`.repeat(24)}note.txt` }
});
const TOKEN_SHAPE = `sk-ant-api03-${'A'.repeat(64)}`;
const BODY_TOKEN = J({
  tool_name: 'Bash',
  tool_input: { command: `curl -H "Authorization: Bearer ${TOKEN_SHAPE}"` }
});

// ---------------------------------------------------------------------------
// The readings, taken off the drawn DOM
// ---------------------------------------------------------------------------

/** Every ⌘J row, with the rectangle of the line beside the name. */
const READ_ROWS = `(() => [...document.querySelectorAll('.attention-row')].map((row) => {
  const span = row.querySelector('.attention-excerpt');
  const style = span === null ? null : getComputedStyle(span);
  return {
    name: row.querySelector('.attention-session')?.textContent ?? '',
    path: row.querySelector('.attention-path')?.textContent ?? null,
    label: (row.getAttribute('aria-label') ?? '').trim(),
    title: (row.getAttribute('title') ?? '').trim(),
    line: span === null ? null : {
      text: span.textContent ?? '',
      chars: (span.textContent ?? '').length,
      dataQuestion: span.getAttribute('data-question'),
      clientWidth: span.clientWidth,
      scrollWidth: span.scrollWidth,
      clientHeight: span.clientHeight,
      scrollHeight: span.scrollHeight,
      whiteSpace: style.whiteSpace,
      textOverflow: style.textOverflow,
      overflow: style.overflow
    }
  };
}))()`;

/** Catch Me Up: every outcome sentence and every question drawn under one. */
const READ_OVERVIEW = `(() => ({
  outcomes: [...document.querySelectorAll('[class*=outcome]')].map((el) => (el.textContent ?? '').trim()),
  questions: [...document.querySelectorAll('.overview-line-question')].map((el) => {
    const style = getComputedStyle(el);
    return {
      text: el.textContent ?? '',
      chars: (el.textContent ?? '').length,
      quoted: el.getAttribute('data-quoted'),
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      whiteSpace: style.whiteSpace
    };
  }),
  text: (document.querySelector('[class*=overview]')?.textContent ?? '').slice(0, 2000)
}))()`;

/** The port and the token, out of the settings file the APP wrote. */
function hookRoute(sessionId) {
  const dir = join(PROFILE, 'gmux', 'hooks', 'claude');
  if (!existsSync(dir)) return { why: `no ${dir}` };
  const file = join(dir, `${sessionId}.json`);
  if (!existsSync(file)) {
    return { why: `no settings file for ${sessionId}; the dir holds ${J(readdirSync(dir))}` };
  }
  const json = JSON.parse(readFileSync(file, 'utf8'));
  const url = json?.hooks?.PermissionRequest?.[0]?.hooks?.[0]?.url ?? '';
  const hit = /^http:\/\/127\.0\.0\.1:(\d+)\/h\/([0-9a-f]{32})\?/.exec(url);
  return hit === null
    ? { why: `the PermissionRequest url is ${J(url)}`, file }
    : { port: Number(hit[1]), token: hit[2], file };
}

async function postHook(route, body) {
  const res = await fetch(
    `http://127.0.0.1:${String(route.port)}/h/${route.token}?e=PermissionRequest`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body }
  );
  return res.status;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const report = { checkout: CHECKOUT, questionMax: QUESTION_MAX, arms: [], readings: {} };
let failures = 0;
const arm = (id, ok, said) => {
  report.arms.push({ id, ok, said });
  if (ok === false) failures += 1;
  say(`${ok === null ? 'NOTE' : ok ? 'PASS' : 'FAIL'} ${id}: ${said}`);
};

/** Attach to the app's own window, by the shared pick rather than by guess. */
async function attach(timeoutMs) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    try {
      const port = Number(
        readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()
      );
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) {
          const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
          say(`attached on port ${String(port)}`);
          return cdp;
        }
        why = picked.why;
      }
    } catch (err) {
      why = String(err?.message ?? err);
    }
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleep(300);
  }
}

/** The row this run is about, by name, out of a rows reading. */
const claudeRow = (rows) => rows.find((r) => r.name === 'p311-claude') ?? null;
const shellRow = (rows) => rows.find((r) => r.name === 'p311-shell') ?? null;

async function statuses(cdp) {
  return JSON.parse(
    await cdpEval(
      cdp,
      `window.__gmuxP93.state().then((s) => JSON.stringify(s.sessions.map((x) => ({ id: x.id, name: x.name, status: x.status }))))`
    )
  );
}

/** Wait until the named session reads a status, or give up and say what it read. */
async function waitForStatus(cdp, name, want, tries) {
  let last = [];
  for (let i = 0; i < tries; i += 1) {
    last = await statuses(cdp);
    const row = last.find((s) => s.name === name);
    if (row !== undefined && row.status === want) return row;
    await sleep(800);
  }
  report.readings.lastStatuses = last;
  return null;
}

async function readRows(cdp) {
  await cdpEval(cdp, 'window.__gmuxP93.openPanel()');
  await sleep(600);
  const rows = JSON.parse(await cdpEval(cdp, `JSON.stringify(${READ_ROWS})`));
  await cdpEval(cdp, 'window.__gmuxP93.closePanel()');
  await sleep(250);
  return rows;
}

async function readOverview(cdp) {
  await cdpEval(cdp, `window.__gmuxShotDrive({ overview: { level: 'project' } })`);
  await sleep(1400);
  const seen = JSON.parse(await cdpEval(cdp, `JSON.stringify(${READ_OVERVIEW})`));
  await cdpEval(
    cdp,
    `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); 1`
  );
  await sleep(400);
  return seen;
}

async function body() {
  const cdp = await attach(120_000);
  await cdp.call('Runtime.enable');
  await cdp.call('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  for (let i = 0; i < 200; i += 1) {
    const armed = await cdpEval(
      cdp,
      `window.__gmuxP93 !== undefined && window.__gmuxP202 !== undefined && typeof window.__gmuxShotDrive === 'function'`
    );
    if (armed === true) break;
    await sleep(300);
  }

  await cdpEval(
    cdp,
    `window.__gmuxP93.setup(${J({ path: PROJECT, names: ['p311-shell'] })}).then(() => true)`
  );
  const made = await cdpEval(
    cdp,
    `window.__gmuxP202.createSession('p311-claude', 'claude').then((x) => JSON.stringify(x)).catch((e) => 'ERR ' + String(e && e.message || e))`
  );
  say(`createSession -> ${String(made)}`);
  const blocked = await waitForStatus(cdp, 'p311-claude', 'needs_input', 60);
  if (blocked === null) {
    arm('setup', false, `the claude session never read needs_input; ${J(report.readings.lastStatuses)}`);
    return;
  }
  const sessionId = blocked.id;
  report.readings.sessionId = sessionId;

  // ---- A, H: today's row, and the control row beside it -------------------
  const before = await readRows(cdp);
  report.readings.A_before = before;
  const rowBefore = claudeRow(before);
  arm(
    'A the parent reading, live',
    rowBefore !== null &&
      rowBefore.line?.text === HINT_ONE &&
      rowBefore.line?.dataQuestion === null,
    `the row drew ${J(rowBefore?.line?.text)} with data-question ${J(rowBefore?.line?.dataQuestion)}; the fixture's last inked line is ${J(HINT_ONE)}`
  );
  const controlBefore = shellRow(before);
  report.readings.geometry = JSON.parse(
    await cdpEval(
      cdp,
      `JSON.stringify({
         win: [window.innerWidth, window.innerHeight],
         panel: (() => { const p = document.querySelector('.attention-panel'); return p === null ? null : Math.round(p.getBoundingClientRect().width); })()
       })`
    )
  );

  // ---- D0: the Catch Me Up line before the hook ---------------------------
  const overviewBefore = await readOverview(cdp);
  report.readings.D0_before = overviewBefore;
  say(`D0 outcomes ${J(overviewBefore.outcomes)}`);

  // ---- the hook: the app's own route, the app's own token -----------------
  const route = hookRoute(sessionId);
  report.readings.route = { file: route.file ?? null, port: route.port ?? null };
  if (route.port === undefined) {
    arm('the hook route', false, `unreadable: ${String(route.why)}`);
    return;
  }
  arm('the hook route', true, `the app wrote ${String(route.file)} and it names 127.0.0.1:${String(route.port)}`);
  const status = await postHook(route, BODY_ONE);
  arm('the POST', status === 200, `the shipping route answered ${String(status)}`);
  await sleep(2600);

  // ---- B, C: the row after the hook, and its rectangle --------------------
  const after = await readRows(cdp);
  report.readings.B_after = after;
  const rowAfter = claudeRow(after);
  arm(
    'B the row says what is being asked',
    rowAfter !== null &&
      rowAfter.line?.dataQuestion === 'true' &&
      rowAfter.line.text.startsWith('Bash rm -rf build') &&
      rowAfter.line.text !== HINT_ONE,
    `the row drew ${J(rowAfter?.line?.text)} with data-question ${J(rowAfter?.line?.dataQuestion)}`
  );
  arm(
    'C one line, tail truncated',
    rowAfter?.line?.clientHeight === rowAfter?.line?.scrollHeight &&
      rowAfter?.line?.whiteSpace === 'nowrap' &&
      rowAfter?.line?.textOverflow === 'ellipsis',
    `height ${String(rowAfter?.line?.clientHeight)} of ${String(rowAfter?.line?.scrollHeight)}, ${String(rowAfter?.line?.whiteSpace)}/${String(rowAfter?.line?.textOverflow)}, ${String(rowAfter?.line?.clientWidth)}px of ${String(rowAfter?.line?.scrollWidth)}px wanted`
  );
  arm(
    'C the whole question is reachable',
    rowAfter !== null &&
      rowAfter.label.includes(rowAfter.line.text) &&
      rowAfter.title.includes(rowAfter.line.text),
    `the row's own label is ${J(rowAfter?.label)}`
  );
  const controlAfter = shellRow(after);
  arm(
    'H the control row is untouched',
    J(controlBefore?.line?.text ?? null) === J(controlAfter?.line?.text ?? null) &&
      (controlAfter?.line?.dataQuestion ?? null) === null,
    `the shell row drew ${J(controlBefore?.line?.text ?? null)} before and ${J(controlAfter?.line?.text ?? null)} after`
  );

  // ---- D: Catch Me Up, same session ---------------------------------------
  const overviewAfter = await readOverview(cdp);
  report.readings.D_after = overviewAfter;
  const waiting = overviewAfter.outcomes.some((o) => o.includes('The agent is waiting for you'));
  const noAnswer = overviewAfter.outcomes.some((o) => o.includes('answer is not in the record'));
  arm(
    'D Catch Me Up stops saying the answer is not in the record',
    waiting && !noAnswer,
    `outcomes ${J(overviewAfter.outcomes)}`
  );
  arm(
    'D the question is drawn under the line',
    overviewAfter.questions.length > 0 &&
      overviewAfter.questions[0].text.includes('rm -rf build') &&
      overviewAfter.questions[0].clientHeight === overviewAfter.questions[0].scrollHeight,
    `questions ${J(overviewAfter.questions)}`
  );

  // ---- E: the cap ---------------------------------------------------------
  await postHook(route, BODY_LONG);
  await sleep(2600);
  const longRows = await readRows(cdp);
  report.readings.E_long = claudeRow(longRows);
  const longLine = report.readings.E_long?.line ?? null;
  arm(
    'E the cap holds and still draws one line',
    longLine !== null &&
      longLine.chars <= QUESTION_MAX &&
      longLine.clientHeight === longLine.scrollHeight,
    `${String(longLine?.chars)} characters against a cap of ${String(QUESTION_MAX)}, height ${String(longLine?.clientHeight)} of ${String(longLine?.scrollHeight)}`
  );

  // ---- F: redaction, on the drawn row -------------------------------------
  await postHook(route, BODY_TOKEN);
  await sleep(2600);
  const tokenRows = await readRows(cdp);
  report.readings.F_token = claudeRow(tokenRows);
  const tokenText = report.readings.F_token?.line?.text ?? '';
  arm(
    'F the drawn row carries no token shape',
    tokenText !== '' && !tokenText.includes('sk-ant-api03') && tokenText.includes('REDACTED'),
    `the row drew ${J(tokenText)}`
  );

  // ---- G: the clear, driven through the screen and not through a hook -----
  writeFileSync(STEP_QUIET, 'go');
  const released = await waitForStatus(cdp, 'p311-claude', 'running', 40);
  say(`G the wait ended: ${released === null ? 'NO' : 'yes'}`);
  writeFileSync(STEP_SECOND, 'go');
  const backAtDialog = await waitForStatus(cdp, 'p311-claude', 'needs_input', 40);
  const secondRows = await readRows(cdp);
  report.readings.G_second = claudeRow(secondRows);
  const second = report.readings.G_second?.line ?? null;
  arm(
    'G a second dialog with no hook draws its own screen line',
    backAtDialog !== null && second !== null && second.text === HINT_TWO && second.dataQuestion === null,
    `the row drew ${J(second?.text)} with data-question ${J(second?.dataQuestion)}; that fixture's last inked line is ${J(HINT_TWO)}`
  );

  // ---- J: reporting only. The pane dies, the session comes back -----------
  //
  // A question has to be LIVE when the pane dies or this arm reads nothing: arm
  // G ended the previous wait and main cleared the question with it. So the
  // first body goes in again, against the second dialog, and only then does the
  // pane die.
  await postHook(route, BODY_ONE);
  await sleep(2600);
  const armed = claudeRow(await readRows(cdp));
  report.readings.J_beforeDeath = armed;
  say(`J a question is live before the death: ${J(armed?.line?.text ?? null)}`);
  writeFileSync(STEP_EXIT, 'go');
  await sleep(6000);
  const beforeRestore = await statuses(cdp);
  report.readings.J_beforeRestore = beforeRestore;
  const restored = await cdpEval(
    cdp,
    `window.gmux.sessions.restore(${J(sessionId)}).then((s) => JSON.stringify({ id: s.id, status: s.status })).catch((e) => 'ERR ' + String(e && e.message || e))`
  );
  say(`J restore -> ${String(restored)}`);
  await sleep(6000);
  const restoredRows = await readRows(cdp);
  report.readings.J_afterRestore = claudeRow(restoredRows);
  const back = report.readings.J_afterRestore?.line ?? null;
  // The only reading this arm can FAIL on: the row drawing the question the
  // previous life was asked, which is what `questionOnWire` exists to stop.
  const stale =
    back !== null && back.dataQuestion === 'true' && back.text.includes('rm -rf build');
  arm(
    'J a restored row never draws the previous life’s question',
    stale ? false : null,
    back === null
      ? 'the restored session is not on the blocked list, so this arm read nothing. Whether inert scrollback reaches needs_input is not this phase’s to decide; the deterministic pin is the monitor suite.'
      : `the restored row drew ${J(back.text)} with data-question ${J(back.dataQuestion)}`
  );

  cdp.close();
}

let ran = false;
try {
  await withElectron(
    {
      label: 'p311',
      userDataDir: PROFILE,
      cwd: CHECKOUT,
      tmuxSocket: SOCKET,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: withoutDevRenderer({
        HOME,
        GMUX_TMUX_SOCKET: SOCKET,
        GMUX_PROBES: '1',
        GMUX_LOG_FILE: '1',
        GMUX_SPECSTORY_NO_CLOUD: '1',
        GMUX_CONFIG_ROOT: join(PROFILE, 'gmux', 'config'),
        P311_SCREEN_ONE: SCREEN_ONE,
        P311_SCREEN_TWO: SCREEN_TWO,
        P311_STEP_QUIET: STEP_QUIET,
        P311_STEP_SECOND: STEP_SECOND,
        P311_STEP_EXIT: STEP_EXIT,
        P311_STORE: STORE,
        P311_SIDFILE: SIDFILE
      }),
      graceMs: 8_000,
      ceilingMs: 420_000
    },
    body
  );
  ran = true;
} catch (err) {
  arm('the run', false, `it threw: ${String(err?.message ?? err)}`);
}

// ---- I: app.log, after the app is gone ------------------------------------
try {
  const log = readFileSync(join(PROFILE, 'logs', 'app.log'), 'utf8');
  const hits = [
    [MARK, 'the planted marker'],
    ['rm -rf build', 'the command'],
    [LONG_SEGMENT, 'the long path'],
    ['sk-ant-api03', 'the token shape']
  ].filter(([needle]) => log.includes(needle));
  report.readings.I_log = { bytes: log.length, hits: hits.map(([, what]) => what) };
  arm(
    'I no line of payload in the log',
    ran && hits.length === 0,
    `${String(log.length)} bytes of app.log, and ${hits.length === 0 ? 'none of the four needles is in it' : `it names ${J(hits.map(([, what]) => what))}`}`
  );
} catch (err) {
  arm('I no line of payload in the log', false, `app.log is unreadable: ${String(err?.message ?? err)}`);
}

const OUT = join(ROOT, 'out', 'p311');
mkdirSync(OUT, { recursive: true });
const outFile = join(OUT, `probe-p311${CHECKOUT === ROOT ? '' : '-other'}.json`);
writeFileSync(outFile, `${J(report, null, 1)}\n`, 'utf8');
say(`wrote ${outFile}`);
if ((process.env['P311_KEEP'] ?? '') !== '1') {
  rmSync(RUN, { recursive: true, force: true });
}
say(failures === 0 ? 'probe:p311 OK' : `probe:p311 FAILED ${String(failures)} arm(s)`);
process.exit(failures === 0 ? 0 : 1);
