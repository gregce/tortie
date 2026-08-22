#!/usr/bin/env node
/**
 * `npm run probe:p131`. Phase 131's own Tier 2 probe for the machine row.
 *
 * IT DRIVES THE REAL SETTINGS WINDOW. A real `/usr/sbin/sshd` is started on
 * 127.0.0.1, a machine is added and confirmed by pressing the controls a person
 * presses, Prepare is pressed, and the expanded row is read back and
 * photographed in five states. Every assertion below is taken from the running
 * page rather than from the source.
 *
 * WHAT PHASE 131 CHANGED, AND WHAT THIS PROBE HOLDS SHUT
 *
 * The operator read one expanded machine row and counted the same fact told
 * three times, with the answer he opened the row for, "This machine is ready",
 * arriving at block 9 of 15. The phase did four things and this probe checks
 * each of them:
 *
 *  1. The readiness answer is the FIRST thing in the open row.
 *  2. Four things went behind one disclosure named "More about this machine",
 *     which is shut when the row opens. They are the settings table, the note
 *     that Tortie read the list of places the machine looks for programs, the
 *     confirm fingerprint, and the promise that Tortie adopts nothing.
 *  3. The four CONSENT facts did not move. What Tortie runs on that machine,
 *     who it signs in as, which key it uses and the Saving files state are all
 *     still on the face of the row.
 *  4. The row draws no line twice. That is the fix round's own item: the
 *     acceptance sheet for a version nobody measured carries the row's own
 *     lines with one entry added, so it may not sit beside the row's own copy.
 *
 * ---------------------------------------------------------------------------
 * SAFETY, and none of it is optional
 * ---------------------------------------------------------------------------
 *  - No machine of the operator's is contacted. Every connection goes to
 *    127.0.0.1 on a high port, against a scratch sshd whose keys are generated
 *    in this run's own directory.
 *  - Every launch uses an isolated `--user-data-dir` under the system
 *    temporary directory. The operator's profile and installed app are never
 *    opened.
 *  - `GMUX_TMUX_SOCKET` is `gmux-p131-row`. The literal `gmux` socket appears
 *    in exactly one place below, a read only session count taken before and
 *    after, which must match.
 *  - Only pids this script recorded are killed. There is no `pkill`, and the
 *    two `kill-server` calls name the scratch socket as a literal.
 *  - Every scratch file carries a `p131-` prefix.
 *
 * The carriage is `build/probe-machines.mjs`, copied rather than imported,
 * because that file is a script with top level `await` and no exports.
 */

import { execFileSync, spawn } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = join(
  process.env['GMUX_HARNESS_DIR'] ?? tmpdir(),
  'p131-row-probe'
);
const profile = join(scratch, 'profile');
const outDir = join(repoRoot, 'out');

/**
 * The scratch socket.
 *
 * `npm run probe:p131` runs this file under `build/harness-socket.mjs`, which
 * composes a name carrying the worktree and its own process id and hands it
 * over as `GMUX_TMUX_SOCKET`. That is what makes two worktrees running this
 * probe at once safe from each other. The literal below is the fallback for
 * `node build/probe-p131-row.mjs` run by hand. Either way the name is refused
 * if it is the operator's own socket.
 */
const SOCKET = process.env['GMUX_TMUX_SOCKET'] ?? 'gmux-p131-row';
if (SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET.startsWith('gmux-')) {
  process.stdout.write(
    `[p131] refusing to run on socket ${SOCKET}. This probe creates and ends a ` +
      `tmux server, so it may only run on a scratch socket named gmux-<something>.\n`
  );
  process.exit(2);
}

const recordedPids = [];
let agentSocket = '';
let remoteProgram = '';

const say = (t) => process.stdout.write(`[p131] ${t}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The strings, copied from src/renderer/settings/machines-copy.ts
// ---------------------------------------------------------------------------
//
// A probe cannot import TypeScript, so each of these must match its constant
// word for word. A string that is nowhere in the product makes an absence
// check pass on its own and measure nothing, which is the defect that made this
// file necessary.

/** `ROW_MORE_LABEL`, new in Phase 131. */
const MORE_LABEL = 'More about this machine';
/** `ROW_HASH_LABEL`, new in Phase 131. */
const HASH_LABEL = 'Fingerprint of what you confirmed:';
/** `PREPARE_SETTINGS_LABEL`, renamed by Phase 131. */
const SETTINGS_LABEL = 'Settings Tortie set on that machine:';
/** `PREPARE_PATH_READ`, unchanged by Phase 131. */
const PATH_READ =
  'Tortie read the list of places that machine looks for programs.';
/** `HONESTY_NO_ADOPTION`, unchanged since Phase 68. */
const NO_ADOPTION =
  'Tortie never adopts work that is already running on your machines';

/** The three strings Phase 131 deleted. None may be drawn anywhere. */
const DELETED = [
  'Settings Tortie asserted:',
  'Tortie started the program on that machine on this visit.',
  'The program was already running on that machine, so Tortie left it running.',
  'Anything already running on that machine is left alone'
];

// ---------------------------------------------------------------------------
// The ledger
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function check(name, ok, detail) {
  if (ok) {
    passed += 1;
    say(`  PASS  ${name}. ${detail}`);
  } else {
    failed += 1;
    say(`  FAIL  ${name}. ${detail}`);
  }
  return ok;
}

function run(file, args, options = {}) {
  return execFileSync(file, args, { encoding: 'utf8', ...options });
}

function operatorSessions() {
  try {
    return run('/bin/sh', [
      '-c',
      "tmux -L gmux list-sessions 2>/dev/null | wc -l | tr -d ' '"
    ]).trim();
  } catch {
    return 'unknown';
  }
}

function killRecorded(pid) {
  if (!recordedPids.includes(pid)) {
    say(`refusing to kill ${String(pid)}: this script did not start it`);
    return;
  }
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    /* already gone */
  }
}

function endScratchServer() {
  try {
    execFileSync('tmux', ['-L', SOCKET, 'kill-server'], { stdio: 'pipe' });
  } catch {
    /* no server is a fine state */
  }
}

// ---------------------------------------------------------------------------
// The carriage
// ---------------------------------------------------------------------------

async function freePort() {
  const { createServer } = await import('node:net');
  return new Promise((ok, bad) => {
    const server = createServer();
    server.on('error', bad);
    server.listen(0, '127.0.0.1', () => {
      const a = server.address();
      const port = typeof a === 'object' && a !== null ? a.port : 0;
      server.close(() => ok(port));
    });
  });
}

/**
 * The path of the key holder's own socket.
 *
 * IT IS NOT UNDER `scratch`, AND THE REASON IS A HARD LIMIT. A unix socket path
 * may be 104 bytes on macOS. `npm run probe:p131` runs this file under
 * `build/harness-socket.mjs`, whose run directory carries the worktree name and
 * a process id, and `<that>/p131-row-probe/p131-agent.sock` measured 103
 * characters in the first run of this probe. The holder never started, key sign
 * in was never offered, and the connection test came back `auth-refused`, so
 * launch 1 confirmed nothing. This path sits directly in the system temporary
 * directory with only a process id on it, which measured 65 characters.
 */
function keyHolderSocketPath() {
  return join(tmpdir(), `p131-${String(process.pid)}.sock`);
}

function startPrivateKeyHolder(userKey) {
  const sock = keyHolderSocketPath();
  if (sock.length > 100) {
    say(`the key holder socket path is ${String(sock.length)} characters, too long`);
    return '';
  }
  try {
    const out = run('/usr/bin/ssh-agent', ['-a', sock]);
    const pid = Number(/SSH_AGENT_PID=(\d+)/.exec(out)?.[1] ?? '0');
    if (pid > 0) recordedPids.push(pid);
    run('/usr/bin/ssh-add', [userKey], {
      env: { ...process.env, SSH_AUTH_SOCK: sock }
    });
    const listed = run('/usr/bin/ssh-add', ['-l'], {
      env: { ...process.env, SSH_AUTH_SOCK: sock }
    });
    const keys = listed
      .trim()
      .split('\n')
      .filter((l) => l.trim() !== '').length;
    say(`a private key holder is up with ${String(keys)} key in it`);
    return keys === 1 ? sock : '';
  } catch (err) {
    say(`could not start a private key holder: ${err.message}`);
    return '';
  }
}

async function startScratchSshd() {
  const sshd = '/usr/sbin/sshd';
  if (!existsSync(sshd)) return 0;
  const hostKey = join(scratch, 'p131-host-key');
  const userKey = join(scratch, 'p131-user-key');
  const authorized = join(scratch, 'p131-authorized_keys');
  const conf = join(scratch, 'p131-sshd_config');
  try {
    run('/usr/bin/ssh-keygen', ['-t', 'ed25519', '-N', '', '-f', hostKey, '-q']);
    run('/usr/bin/ssh-keygen', ['-t', 'ed25519', '-N', '', '-f', userKey, '-q']);
    writeFileSync(authorized, readFileSync(`${userKey}.pub`, 'utf8'), 'utf8');
    chmodSync(hostKey, 0o600);
    chmodSync(userKey, 0o600);
    chmodSync(authorized, 0o600);
  } catch (err) {
    say(`could not generate scratch keys: ${err.message}`);
    return 0;
  }
  const port = await freePort();
  writeFileSync(
    conf,
    [
      'ListenAddress 127.0.0.1',
      'PasswordAuthentication no',
      'ChallengeResponseAuthentication no',
      'KbdInteractiveAuthentication no',
      'UsePAM no',
      'StrictModes no',
      `AuthorizedKeysFile ${authorized}`,
      `PidFile ${join(scratch, 'p131-sshd.pid')}`,
      'LogLevel VERBOSE'
    ].join('\n') + '\n',
    'utf8'
  );
  const child = spawn(
    sshd,
    ['-D', '-e', '-f', conf, '-h', hostKey, '-p', String(port)],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  recordedPids.push(child.pid);
  let stderr = '';
  child.stderr.on('data', (c) => {
    stderr += String(c);
  });
  await sleep(1_500);
  if (
    child.exitCode !== null ||
    stderr.includes('Bind to port') ||
    stderr.includes('fatal')
  ) {
    say(`a non root sshd could not start: ${stderr.trim().split('\n')[0] ?? ''}`);
    killRecorded(child.pid);
    return 0;
  }
  agentSocket = startPrivateKeyHolder(userKey);
  return port;
}

// ---------------------------------------------------------------------------
// Driving the real Settings window
// ---------------------------------------------------------------------------

function driveSettings({ shot, js, timeoutMs = 150_000 }) {
  return new Promise((done) => {
    const child = spawn(
      'npx',
      [
        'electron',
        '.',
        `--user-data-dir=${profile}`,
        '-ApplePersistenceIgnoreState',
        'YES'
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          GMUX_SHOT: shot,
          GMUX_SHOT_SETTINGS: '1',
          GMUX_SHOT_SETTINGS_JS: js,
          GMUX_TMUX_SOCKET: SOCKET,
          ...(agentSocket === '' ? {} : { SSH_AUTH_SOCK: agentSocket })
        },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    recordedPids.push(child.pid);
    let out = '';
    child.stdout.on('data', (c) => {
      out += String(c);
    });
    child.stderr.on('data', (c) => {
      out += String(c);
    });
    const timer = setTimeout(() => killRecorded(child.pid), timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(timer);
      const line =
        out.split('\n').find((l) => l.includes('[gmux-shot] driver')) ?? '';
      const payload = line.slice(line.indexOf('driver') + 8).trim();
      let parsed = null;
      try {
        parsed = JSON.parse(payload.replace(/^→\s*/, ''));
      } catch {
        parsed = null;
      }
      done({ code, out, payload, parsed });
    });
  });
}

function driver(body) {
  return `(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const text = () => document.body.innerText || '';
    const q = (s) => document.querySelector(s);
    const openMachines = async () => {
      if (
        text().includes('Tortie can keep your work running on another machine you own.') ||
        text().includes('Add a machine')
      ) return 'already';
      const rail = Array.from(document.querySelectorAll('button, [role="tab"], li, a'))
        .find((n) => (n.textContent || '').trim() === 'Machines');
      if (rail === null || rail === undefined) return 'not-found';
      rail.click();
      await wait(700);
      return 'clicked';
    };
    const type = (selector, value) => {
      const el = q(selector);
      if (el === null) return false;
      const proto =
        el.tagName === 'SELECT'
          ? window.HTMLSelectElement.prototype
          : el.tagName === 'TEXTAREA'
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, String(value));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    const field = (name, value) => type('[data-machines-field="' + name + '"]', value);
    const act = async (name) => {
      const el = q('[data-machines-action="' + name + '"]');
      if (el === null) return false;
      if (el.disabled === true) return 'disabled';
      el.click();
      await wait(400);
      return true;
    };
    const until = async (selector, ms) => {
      const deadline = Date.now() + ms;
      for (;;) {
        const el = q(selector);
        if (el !== null) return el;
        if (Date.now() > deadline) return null;
        await wait(150);
      }
    };
    const openAdvanced = () => {
      const d = q('details.mach-advanced');
      if (d !== null) d.open = true;
    };
    const transcriptOnScreen = () => {
      const el = q('[data-machines-transcript]');
      return el === null ? '' : el.textContent || '';
    };
    const runTestByButton = async (host, port, label, program, user) => {
      await act('open-add');
      field('host', host);
      field('label', label);
      openAdvanced();
      // The account is typed on purpose. A row with no account carries no
      // "Signs in as:" line, and that line is one of the four consent facts
      // this probe has to find on the face of the row. The first run of this
      // probe left the field empty and three checks failed on a fact the
      // product had never been asked to draw.
      if (user) field('user', user);
      if (port !== null) field('port', port);
      if (program) field('remoteTmuxPath', program);
      await wait(200);
      const started = await act('test-draft');
      let answered = false;
      const deadline = Date.now() + 45000;
      while (Date.now() < deadline) {
        const seen = transcriptOnScreen();
        if (!answered && /\\(yes\\/no|fingerprint|continue connecting/i.test(seen)) {
          answered = true;
          field('answer', 'yes');
          await wait(120);
          await act('send');
        }
        if (q('[data-outcome-class]') !== null) break;
        await wait(200);
      }
      const outcomeEl = q('[data-outcome-class]');
      return {
        started,
        answered,
        outcomeClass: outcomeEl === null ? null : outcomeEl.getAttribute('data-outcome-class')
      };
    };
    /** Every line of one element, in the order the browser lays it out. */
    const linesOf = (el) =>
      el === null
        ? null
        : (el.innerText || '').split('\\n').map((l) => l.trim()).filter((l) => l !== '');
    /**
     * Where each of the row's blocks sits, as a position in the open detail.
     *
     * The order is read from the document rather than from character offsets in
     * a string, so there is one coordinate system and nothing to get wrong.
     */
    const blockOrder = (detail) => {
      if (detail === null) return null;
      const seen = Array.from(detail.querySelectorAll('*'));
      const at = (sel) => {
        const el = detail.querySelector(sel);
        return el === null ? -1 : seen.indexOf(el);
      };
      return {
        state: at('.mach-prepare-result'),
        headline: at('.mach-prepare-headline'),
        ownLines: at('.mach-lines-block'),
        keyLine: at('[data-machine-key-line]'),
        prepare: at('[data-machines-action="prepare"]'),
        saving: at('[data-machines-writes]'),
        accept: at('[data-machines-accept]'),
        more: at('[data-machines-more]')
      };
    };
    const m = () => window.gmux && window.gmux.machines;
    try {
      const result = await (async () => { ${body} })();
      return JSON.stringify(result);
    } catch (err) {
      return JSON.stringify({ error: String(err && err.message ? err.message : err) });
    }
  })()`;
}

/**
 * The body every launch after the first shares.
 *
 * It opens Machines, presses Show on the one row, optionally presses Prepare,
 * optionally opens the disclosure, and reads the row back. It reads the face
 * of the row and the inside of the disclosure SEPARATELY, because `innerText`
 * does not carry the contents of a shut `details` and a check that only read
 * the whole page could not tell the two apart.
 */
function expandBody({ prepare, openMore, scrollTo }) {
  return `
    const trail = [];
    await openMachines();
    trail.push('opened');
    const rows = await m().rows();
    trail.push('rows:' + String(rows.rows.length));
    const id = rows.rows.length > 0 ? rows.rows[0].id : null;
    const toggle = id === null
      ? null
      : q('[data-machine-id="' + id + '"] [data-machines-action="toggle-lines"]');
    if (toggle !== null) { toggle.click(); await wait(500); }
    trail.push('expanded');
    ${
      prepare
        ? `const button = id === null
             ? null
             : q('[data-machine-id="' + id + '"] [data-machines-action="prepare"]');
           if (button !== null && button.disabled === false) button.click();
           const block = await until('.mach-prepare-result', 60000);
           trail.push('prepared:' + String(block !== null));
           await wait(900);`
        : `trail.push('not-prepared-on-purpose');`
    }
    const detail = id === null
      ? null
      : q('[data-machine-id="' + id + '"] .set-config-detail');
    const more = q('details.mach-more');
    const shutBefore = more === null ? null : more.hasAttribute('open');
    // The face of the row, read while the disclosure is still shut.
    const faceLines = linesOf(detail);
    const face = faceLines === null ? '' : faceLines.join('\\n');
    ${
      openMore
        ? `if (more !== null) { more.open = true; await wait(500); }
           trail.push('more-open');`
        : `trail.push('more-shut');`
    }
    const insideLines = linesOf(more);
    const inside = insideLines === null ? '' : insideLines.join('\\n');
    const target = q(${JSON.stringify(scrollTo)});
    if (target !== null) target.scrollIntoView({ block: 'start' });
    await wait(500);
    const whole = text();
    const count = (hay, needle) => hay.split(needle).length - 1;
    const dupes = {};
    if (faceLines !== null) for (const l of faceLines) dupes[l] = (dupes[l] || 0) + 1;
    return {
      trail,
      id,
      moreDrawn: more !== null,
      moreShutOnOpen: shutBefore === false,
      moreSummary: more === null ? null : (more.querySelector('summary').textContent || '').trim(),
      faceLines,
      insideLines,
      order: blockOrder(detail),
      prepareClass: (() => {
        const b = q('.mach-prepare-result');
        return b === null ? null : b.getAttribute('data-prepare-class');
      })(),
      headline: (() => {
        const b = q('.mach-prepare-headline');
        return b === null ? null : (b.textContent || '').trim();
      })(),

      // The four things Phase 131 moved. Absent from the face, present inside.
      moved: {
        settingsOnFace: face.includes(${JSON.stringify(SETTINGS_LABEL)}),
        settingsInside: inside.includes(${JSON.stringify(SETTINGS_LABEL)}),
        pathOnFace: face.includes(${JSON.stringify(PATH_READ)}),
        pathInside: inside.includes(${JSON.stringify(PATH_READ)}),
        hashOnFace: face.includes(${JSON.stringify(HASH_LABEL)}),
        hashInside: inside.includes(${JSON.stringify(HASH_LABEL)}),
        adoptOnFace: face.includes(${JSON.stringify(NO_ADOPTION)}),
        adoptInside: inside.includes(${JSON.stringify(NO_ADOPTION)})
      },

      // The four consent facts. Each on the face, none inside.
      consent: {
        runsProgramOnFace: face.includes('Runs this program on that machine:'),
        runsProgramInside: inside.includes('Runs this program on that machine:'),
        signsInOnFace: face.includes('Signs in as:'),
        signsInInside: inside.includes('Signs in as:'),
        keyNodes: detail === null ? 0 : detail.querySelectorAll('[data-machine-key-line]').length,
        keyInside: more === null ? 0 : more.querySelectorAll('[data-machine-key-line]').length,
        writesNodes: detail === null ? 0 : detail.querySelectorAll('[data-machines-writes]').length,
        writesInside: more === null ? 0 : more.querySelectorAll('[data-machines-writes]').length
      },

      optionRowsAnywhere: document.querySelectorAll('[data-prepare-option]').length,
      optionRowsInside: more === null ? 0 : more.querySelectorAll('[data-prepare-option]').length,
      hashNodes: document.querySelectorAll('[data-machine-hash]').length,
      hashInside: more === null ? 0 : more.querySelectorAll('[data-machine-hash]').length,

      // Nothing on the face of the row is drawn twice.
      repeatedFaceLines: Object.entries(dupes).filter(([, n]) => n > 1),

      // The deleted strings, counted on the whole page in this state.
      deleted: ${JSON.stringify(DELETED)}.map((s) => [s, count(whole, s)]),
      // The one telling that survived, counted on the whole page.
      //
      // IT IS NOT A COUNT OF THE WORDS "already running", AND THIS IS WHY.
      // Main's own detail sentence carries those words in its warm shape, so a
      // machine whose program was already running reads them twice and a
      // machine Tortie just started reads them once, and neither is a
      // repetition. The two sentences say different things. What the operator
      // counted was three tellings of the one fact that Tortie leaves running
      // work alone, so that sentence is what is counted.
      noAdoptionTellings: count(whole, ${JSON.stringify(NO_ADOPTION)}),

      // No tmux vocabulary is drawn. The program path a person consented to
      // and the value tmux-256color both carry the word "tmux" and neither is
      // vocabulary, so the four forbidden words are counted instead.
      vocab: (() => {
        const t = whole.toLowerCase();
        return {
          pane: (t.match(/\\bpane\\b/g) || []).length,
          window: (t.match(/\\bwindow\\b/g) || []).length,
          prefix: (t.match(/\\bprefix\\b/g) || []).length,
          sessionOption: (t.match(/session option/g) || []).length
        };
      })(),
      longDash: whole.includes('\\u2014') || whole.includes('\\u2013')
    };
  `;
}

/** A program that reports a version nobody has measured. */
function writeMadeUpVersionProgram() {
  const path = join(scratch, 'p131-stub-tmux');
  writeFileSync(path, '#!/bin/sh\necho "tmux 0.0-p131-made-up"\nexit 0\n', 'utf8');
  chmodSync(path, 0o755);
  return path;
}

/** The checks every expanded state shares. */
function checkCommon(label, d) {
  check(
    `${label}: the row has one disclosure and it is shut when the row opens`,
    d.moreDrawn === true &&
      d.moreShutOnOpen === true &&
      d.moreSummary === MORE_LABEL,
    `drawn ${String(d.moreDrawn)}, shut on open ${String(d.moreShutOnOpen)}, ` +
      `summary ${JSON.stringify(d.moreSummary)}`
  );
  check(
    `${label}: the four consent facts are on the face of the row`,
    d.consent.runsProgramOnFace === true &&
      d.consent.runsProgramInside === false &&
      d.consent.signsInOnFace === true &&
      d.consent.signsInInside === false &&
      d.consent.keyNodes === 1 &&
      d.consent.keyInside === 0 &&
      d.consent.writesNodes === 1 &&
      d.consent.writesInside === 0,
    `the program line ${String(d.consent.runsProgramOnFace)} on the face and ` +
      `${String(d.consent.runsProgramInside)} inside, the sign in line ` +
      `${String(d.consent.signsInOnFace)} and ${String(d.consent.signsInInside)}, ` +
      `${String(d.consent.keyNodes)} key line with ${String(d.consent.keyInside)} ` +
      `inside, ${String(d.consent.writesNodes)} Saving files block with ` +
      `${String(d.consent.writesInside)} inside`
  );
  check(
    `${label}: the promise and the fingerprint are behind the disclosure`,
    d.moved.adoptOnFace === false &&
      d.moved.hashOnFace === false &&
      d.hashNodes === 1 &&
      d.hashInside === 1,
    `the promise is on the face ${String(d.moved.adoptOnFace)}, the fingerprint ` +
      `label ${String(d.moved.hashOnFace)}, and of ${String(d.hashNodes)} hash ` +
      `nodes ${String(d.hashInside)} are inside the disclosure`
  );
  check(
    `${label}: no line on the face of the row is drawn twice`,
    d.repeatedFaceLines.length === 0,
    `repeated lines: ${JSON.stringify(d.repeatedFaceLines)}`
  );
  check(
    `${label}: the three deleted sentences are nowhere on the page`,
    d.deleted.every(([, n]) => n === 0),
    `counts: ${JSON.stringify(d.deleted)}`
  );
  check(
    `${label}: no tmux vocabulary is drawn`,
    d.vocab.pane === 0 &&
      d.vocab.window === 0 &&
      d.vocab.prefix === 0 &&
      d.vocab.sessionOption === 0,
    `counts: ${JSON.stringify(d.vocab)}`
  );
  check(
    `${label}: no long dash is on the page`,
    d.longDash === false,
    `a long or short dash anywhere: ${String(d.longDash)}`
  );
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const sessionsBefore = operatorSessions();
say(`operator sessions before: ${sessionsBefore}`);

rmSync(scratch, { recursive: true, force: true });
mkdirSync(scratch, { recursive: true });
mkdirSync(outDir, { recursive: true });

/**
 * The account typed into the Add sheet.
 *
 * The far side of every connection here is this same Mac, so the account that
 * signs in is the one running this script. It is typed rather than left blank
 * because a row with no account draws no "Signs in as:" line, and that line is
 * one of the four consent facts this probe checks for.
 */
const account = process.env['USER'] ?? '';

remoteProgram = existsSync('/opt/homebrew/bin/tmux')
  ? '/opt/homebrew/bin/tmux'
  : existsSync('/usr/local/bin/tmux')
    ? '/usr/local/bin/tmux'
    : '/usr/bin/tmux';
say(`the program path typed into Advanced is ${remoteProgram}`);

const port = await startScratchSshd();
if (port === 0) {
  say('FAIL: a scratch sshd could not start, so nothing here is evidence');
  process.exit(1);
}
say(`carriage: a real /usr/sbin/sshd on 127.0.0.1:${String(port)}`);

say('launch 1 of 6: add and confirm a machine by pressing the real controls');
const l1 = await driveSettings({
  shot: join(outDir, 'p131-0-confirmed.png'),
  js: driver(`
    await openMachines();
    const drove = await runTestByButton('127.0.0.1', ${port}, 'Scratch box', ${JSON.stringify(remoteProgram)}, ${JSON.stringify(account)});
    const clicked = await act('add-confirm');
    await wait(1200);
    const listed = await m().rows();
    return {
      outcomeClass: drove.outcomeClass,
      clicked,
      rows: listed.rows.map((r) => ({ id: r.id, state: r.state, label: r.label }))
    };
  `)
});
if (
  l1.parsed === null ||
  !Array.isArray(l1.parsed.rows) ||
  l1.parsed.rows.length !== 1
) {
  say(`FAIL: no machine was confirmed, so the rest measures nothing`);
  say(String(l1.out).split('\n').slice(-25).join('\n'));
  process.exit(1);
}
say(`launch 1: ${JSON.stringify(l1.parsed)}`);

// End the scratch server so Prepare is a birth on the launches that follow.
endScratchServer();

const states = [
  {
    key: 'A',
    label: 'A prepared row, disclosure shut',
    shot: join(outDir, 'p131-A-prepared-shut.png'),
    body: expandBody({ prepare: true, openMore: false, scrollTo: '.mach-row' })
  },
  {
    key: 'B',
    label: 'A prepared row, disclosure open',
    shot: join(outDir, 'p131-B-prepared-open.png'),
    body: expandBody({
      prepare: true,
      openMore: true,
      scrollTo: 'details.mach-more'
    })
  },
  {
    key: 'D',
    label: 'A confirmed row whose Prepare was never pressed',
    shot: join(outDir, 'p131-D-unprepared-open.png'),
    body: expandBody({
      prepare: false,
      openMore: true,
      scrollTo: 'details.mach-more'
    })
  }
];

const seen = {};
let n = 1;
for (const s of states) {
  n += 1;
  say(`launch ${String(n)} of 6: ${s.label}`);
  const res = await driveSettings({ shot: s.shot, js: driver(s.body) });
  if (res.parsed === null || res.parsed.error !== undefined) {
    check(`${s.key}: the driver answered`, false, `payload ${res.payload}`);
    say(String(res.out).split('\n').slice(-20).join('\n'));
    continue;
  }
  seen[s.key] = res.parsed;
  checkCommon(s.key, res.parsed);
  say(
    `  photograph ${s.shot} at ${
      existsSync(s.shot) ? String(statSync(s.shot).size) : '0'
    } bytes`
  );
}

// The checks that belong to one state only.
if (seen.A !== undefined) {
  const d = seen.A;
  check(
    'A: the readiness answer is the first line of the open row',
    Array.isArray(d.faceLines) &&
      d.faceLines.length > 0 &&
      d.faceLines[0] === d.headline &&
      d.order !== null &&
      d.order.headline < d.order.ownLines,
    `the first line reads ${JSON.stringify(d.faceLines?.[0] ?? null)} and the ` +
      `headline is ${JSON.stringify(d.headline)}. Block order ` +
      `${JSON.stringify(d.order)}`
  );
  check(
    'A: nothing behind the disclosure is readable while it is shut',
    d.moved.settingsOnFace === false && d.moved.pathOnFace === false,
    `the settings label is on the face ${String(d.moved.settingsOnFace)} and the ` +
      `program list note ${String(d.moved.pathOnFace)}`
  );
  check(
    'A: the promise is not on the row while the disclosure is shut',
    d.noAdoptionTellings === 0,
    `the page tells it ${String(d.noAdoptionTellings)} times, and with the ` +
      `disclosure shut that must be none`
  );
}

if (seen.B !== undefined) {
  const d = seen.B;
  check(
    'B: the settings table and the program list note are inside the disclosure',
    d.moved.settingsInside === true &&
      d.moved.pathInside === true &&
      d.optionRowsAnywhere >= 12 &&
      d.optionRowsAnywhere === d.optionRowsInside,
    `the settings label is inside ${String(d.moved.settingsInside)}, the program ` +
      `list note ${String(d.moved.pathInside)}, and of ` +
      `${String(d.optionRowsAnywhere)} setting rows on the page ` +
      `${String(d.optionRowsInside)} are inside the disclosure`
  );
  check(
    'B: the promise and the fingerprint are inside the disclosure',
    d.moved.adoptInside === true && d.moved.hashInside === true,
    `the promise ${String(d.moved.adoptInside)} and the fingerprint label ` +
      `${String(d.moved.hashInside)}`
  );
  check(
    'B: the one telling that survived is told exactly once',
    d.noAdoptionTellings === 1,
    `the page tells the promise ${String(d.noAdoptionTellings)} times with the ` +
      `disclosure open, and it must be once. The other two tellings of the same ` +
      `fact were deleted`
  );
  check(
    'B: the disclosure holds those four things and no consent fact',
    Array.isArray(d.insideLines) && d.insideLines.length > 0,
    `it holds ${String(d.insideLines?.length ?? 0)} lines: ` +
      `${JSON.stringify(d.insideLines)}`
  );
}

if (seen.D !== undefined) {
  const d = seen.D;
  check(
    'D: a row whose Prepare never answered draws no settings and no note',
    d.optionRowsAnywhere === 0 && d.moved.settingsInside === false &&
      d.moved.pathInside === false,
    `${String(d.optionRowsAnywhere)} setting rows, the settings label inside ` +
      `${String(d.moved.settingsInside)}, the program list note ` +
      `${String(d.moved.pathInside)}`
  );
  check(
    'D: it still holds the promise and the fingerprint',
    d.moved.adoptInside === true && d.moved.hashInside === true,
    `the promise ${String(d.moved.adoptInside)} and the fingerprint ` +
      `${String(d.moved.hashInside)}`
  );
}

// ---------------------------------------------------------------------------
// The state the fix round exists for
// ---------------------------------------------------------------------------
//
// A machine that reports a version nobody has measured gets the Phase 83
// acceptance sheet. That sheet's lines are the row's own lines with one entry
// added for the version being accepted, and its warning is the row's own
// warning. When the state block was moved to the top of the row the sheet came
// with it, and four lines were then drawn twice with one short block between
// them. The sheet is drawn below the Saving files block now.

say('launch 5 of 6: a row refused for a version nobody measured');
const stub = writeMadeUpVersionProgram();
const e = await driveSettings({
  shot: join(outDir, 'p131-E-version-refused.png'),
  js: driver(
    `
    const trail = [];
    await openMachines();
    const drove = await runTestByButton('127.0.0.1', ${port}, 'Made up version box', '__STUB__', ${JSON.stringify(account)});
    trail.push('tested:' + String(drove && drove.outcomeClass));
    const added = await act('add-confirm');
    await wait(1200);
    const rows = await m().rows();
    const row = rows.rows.find((r) => r.remoteTmuxPath === '__STUB__') || null;
    trail.push('row:' + String(row && row.id));
    const toggle = row === null
      ? null
      : q('[data-machine-id="' + row.id + '"] [data-machines-action="toggle-lines"]');
    if (toggle !== null) { toggle.click(); await wait(500); }
    const button = row === null
      ? null
      : q('[data-machine-id="' + row.id + '"] [data-machines-action="prepare"]');
    if (button !== null && button.disabled === false) button.click();
    const block = await until('.mach-prepare-result[data-prepare-class="version-unmeasured"]', 60000);
    trail.push('block:' + String(block !== null));
    await wait(900);
    const detail = row === null
      ? null
      : q('[data-machine-id="' + row.id + '"] .set-config-detail');
    const faceLines = linesOf(detail);
    const dupes = {};
    if (faceLines !== null) for (const l of faceLines) dupes[l] = (dupes[l] || 0) + 1;
    const scope = row === null ? null : q('[data-machine-id="' + row.id + '"]');
    if (scope !== null) scope.scrollIntoView({ block: 'start' });
    await wait(500);
    return {
      trail,
      rowId: row === null ? null : row.id,
      drawnClass: block === null ? null : block.getAttribute('data-prepare-class'),
      acceptButtons: document.querySelectorAll('[data-machines-action="accept-version"]').length,
      order: blockOrder(detail),
      faceLines,
      repeatedFaceLines: Object.entries(dupes).filter(([, n]) => n > 1),
      // The gap between the sheet's copy of the row's lines and the row's own
      // copy, counted in lines a person reads.
      gapLines: (() => {
        if (faceLines === null) return -1;
        const first = faceLines.indexOf('Runs this program on that machine: __STUB__');
        const last = faceLines.lastIndexOf('Runs this program on that machine: __STUB__');
        return first === last ? -1 : last - first;
      })()
    };
  `.replace(/__STUB__/g, stub)
  )
});

if (e.parsed === null || e.parsed.error !== undefined) {
  check('E: the driver answered', false, `payload ${e.payload}`);
  say(String(e.out).split('\n').slice(-20).join('\n'));
} else {
  const d = e.parsed;
  check(
    'E: the row is refused for a version nobody measured, and offers acceptance',
    d.drawnClass === 'version-unmeasured' && d.acceptButtons === 1,
    `class ${JSON.stringify(d.drawnClass)}, ${String(d.acceptButtons)} accept ` +
      `button`
  );
  check(
    'E: the state block is first and the acceptance sheet is far below it',
    d.order !== null &&
      d.order.state === 0 &&
      d.order.state < d.order.ownLines &&
      d.order.ownLines < d.order.prepare &&
      d.order.prepare < d.order.saving &&
      d.order.saving < d.order.accept &&
      d.order.accept < d.order.more,
    `block order ${JSON.stringify(d.order)}, and it must read state, then the ` +
      `row's own lines, then Prepare, then Saving files, then the acceptance ` +
      `sheet, then the disclosure`
  );
  check(
    'E: the two copies of the program line are at least 8 lines apart',
    d.gapLines >= 8,
    `the row's own copy and the sheet's copy are ${String(d.gapLines)} lines ` +
      `apart. Before this fix they were 5 lines apart, back to back`
  );
  check(
    'E: the acceptance sheet is the only thing on this row drawn twice',
    d.repeatedFaceLines.every(
      ([line]) =>
        line.startsWith('Machine: ') ||
        line.startsWith('Signs in as: ') ||
        line.startsWith('Port: ') ||
        line.startsWith('Runs this program on that machine: ') ||
        line.startsWith('This names a machine Tortie will sign in to as you')
    ),
    `repeated lines: ${JSON.stringify(d.repeatedFaceLines)}. Both copies are ` +
      `moments of agreement and each one has to state in full what it binds, ` +
      `so neither may be cut. They are kept apart instead`
  );
  say(`  ${JSON.stringify(d.faceLines)}`);
}

// ---------------------------------------------------------------------------
// The end
// ---------------------------------------------------------------------------

for (const pid of [...recordedPids].reverse()) {
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    /* already gone */
  }
}
endScratchServer();
rmSync(keyHolderSocketPath(), { force: true });

const sessionsAfter = operatorSessions();
check(
  "the operator's own tmux server did not move",
  sessionsBefore === sessionsAfter,
  `${sessionsBefore} sessions before and ${sessionsAfter} after`
);
say(`profile: ${profile}, and the operator's own was never opened`);
rmSync(scratch, { recursive: true, force: true });

say(`${String(passed)} checks passed, ${String(failed)} failed`);
process.exit(failed === 0 ? 0 : 1);
