#!/usr/bin/env node
/**
 * `node build/probe-machines.mjs`. The Tier 2 live probe for Phase 68.
 *
 * It drives the REAL Settings window against a REAL ssh carriage on
 * `127.0.0.1`, ten measured steps with six screenshots, and prints a table.
 *
 * ---------------------------------------------------------------------------
 * SAFETY, and none of it is optional
 * ---------------------------------------------------------------------------
 *  - No machine of the operator's is contacted. Every connection goes to
 *    127.0.0.1 on a high port, against a scratch sshd whose keys are generated
 *    in this run's own directory.
 *  - Every launch uses an isolated `--user-data-dir` under the scratch
 *    directory. The operator's profile, manifest and installed app are never
 *    touched.
 *  - The tmux socket is set to a scratch name. Nothing here creates a tmux
 *    session at all, and Phase 68 has no code that could.
 *  - Only pids this script recorded are killed. There is no `pkill` and no
 *    `kill-server`.
 *  - Every scratch file carries a `p68-` prefix.
 *
 * ---------------------------------------------------------------------------
 * THE CARRIAGE, and what a fallback run does and does not prove
 * ---------------------------------------------------------------------------
 * The probe first tries to start `/usr/sbin/sshd` as this user, on a high port
 * bound to 127.0.0.1, with keys it generated. When that works, the connection
 * steps run against a real ssh client talking to a real ssh server, and the
 * host key question is the client's own.
 *
 * When a non root sshd cannot start on this machine, the probe falls back to a
 * scripted stand in named through `GMUX_SSH_BIN`, which reproduces the host key
 * question and the marker output byte for byte. **A fallback run is evidence
 * about Tortie and it is not evidence about ssh.** The report says which of the
 * two ran, in one line, and a reader must not read more into it than that.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DRIVES, honestly
 * ---------------------------------------------------------------------------
 * Each step says how it was driven. `button` means the probe typed into the
 * real fields and clicked the real controls in the Settings window. `bridge`
 * means the probe called the same channel the button calls, through
 * `window.gmux.machines` in the Settings renderer. Both go through the real
 * preload and the real main handlers. A step that could only be driven through
 * the bridge is marked, so a reader can see which parts of the surface were
 * exercised as a person would.
 *
 * THE DIFFERENCE IS NOT ACADEMIC, and the last round proved it. Steps 3, 4 and
 * 8 used to go through the bridge alone. The bridge worked. The Add button did
 * not, because the code behind it sent a hash it had made up and main refused
 * every add. The bridge run went green and the product could not add a machine.
 * The connection test view was also never mounted, so three screenshots that
 * claimed to show the test, the confirmed row and the alarm were all the same
 * photograph of an empty section. Those three steps press the controls now.
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
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = join(tmpdir(), 'p68-machines-probe');
const profile = join(scratch, 'profile');
const outDir = join(repoRoot, 'out');

/** Every pid this script started. Nothing else is ever killed. */
const recordedPids = [];

/** One row per step, printed at the end whatever the verdict. */
const steps = [];

let carriage = 'none';
let sshdPort = 0;

/**
 * The private key holder this run's client signs in with, or ''.
 *
 * It holds ONE key, generated in this run's own directory, and it is the
 * operator's agent in no sense at all. Without it the client has no way to use
 * the key the scratch server accepts, so it cannot authenticate, and steps 3 to
 * 6 all fail with `auth-refused` in about 300 ms. That is exactly what happened
 * before this existed.
 */
let agentSocket = '';

/**
 * The absolute program path the probe types into the Advanced field, or ''.
 *
 * MEASURED, and it is why the field exists. The scratch server is this Mac, and
 * a connection to it runs a login shell whose PATH does not carry Homebrew's
 * directory, so `command -v tmux` answers with nothing and the outcome is
 * `no-program`. That is the honest answer for a bare name, and it is exactly the
 * case research 51 section 4.2 put the Advanced field there for: a person tells
 * the test what to look for and the machine reports back the absolute path. The
 * probe types the path this Mac has, and a Mac without one gets a run that says
 * so rather than a run that pretends.
 */
let remoteProgram = '';

/** The person's own record of machine identities. Read only, measured only. */
const userKnownHosts = join(homedir(), '.ssh', 'known_hosts');

/** Its size in bytes, or null when there is no such file. */
function userKnownHostsBytes() {
  try {
    return statSync(userKnownHosts).size;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(file, args, options = {}) {
  return execFileSync(file, args, { encoding: 'utf8', ...options });
}

function note(step, what, verdict, detail) {
  steps.push({ step, what, verdict, detail });
  const mark = verdict === 'pass' ? 'pass' : verdict === 'skip' ? 'skip' : 'FAIL';
  console.log(`[p68] step ${String(step)} ${mark}: ${what}. ${detail}`);
}

/** Is this pid alive? Used only for pids this script recorded. */
function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Kill one recorded pid, and only a recorded one. */
function killRecorded(pid) {
  if (!recordedPids.includes(pid)) {
    console.error(`[p68] refusing to kill ${String(pid)}: this script did not start it`);
    return;
  }
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    /* already gone is the state we wanted */
  }
}

// ---------------------------------------------------------------------------
// The carriage
// ---------------------------------------------------------------------------

/** A free high port on the loopback address. */
async function freePort() {
  const { createServer } = await import('node:net');
  return new Promise((resolveport, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      server.close(() => {
        resolveport(port);
      });
    });
  });
}

/**
 * Try to start a scratch sshd on 127.0.0.1. Returns the port, or 0.
 *
 * Everything it needs is generated here. No key of the operator's is read and
 * none is written outside the scratch directory.
 */
async function startScratchSshd() {
  const sshd = '/usr/sbin/sshd';
  if (!existsSync(sshd)) return 0;
  const hostKey = join(scratch, 'p68-host-key');
  const userKey = join(scratch, 'p68-user-key');
  const authorized = join(scratch, 'p68-authorized_keys');
  const conf = join(scratch, 'p68-sshd_config');
  try {
    run('/usr/bin/ssh-keygen', ['-t', 'ed25519', '-N', '', '-f', hostKey, '-q']);
    run('/usr/bin/ssh-keygen', ['-t', 'ed25519', '-N', '', '-f', userKey, '-q']);
    writeFileSync(authorized, readFileSync(`${userKey}.pub`, 'utf8'), 'utf8');
    chmodSync(hostKey, 0o600);
    chmodSync(userKey, 0o600);
    chmodSync(authorized, 0o600);
  } catch (err) {
    console.log(`[p68] could not generate scratch keys: ${err.message}`);
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
      `PidFile ${join(scratch, 'p68-sshd.pid')}`,
      'LogLevel VERBOSE'
    ].join('\n') + '\n',
    'utf8'
  );
  const child = spawn(sshd, ['-D', '-e', '-f', conf, '-h', hostKey, '-p', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  recordedPids.push(child.pid);
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });
  await sleep(1_500);
  if (child.exitCode !== null || stderr.includes('Bind to port') || stderr.includes('fatal')) {
    console.log(`[p68] a non root sshd could not start: ${stderr.trim().split('\n')[0] ?? ''}`);
    killRecorded(child.pid);
    return 0;
  }
  sshdPort = port;
  agentSocket = startPrivateKeyHolder(userKey);
  return port;
}

/**
 * Start a private key holder for this run, holding ONE key.
 *
 * WHY THIS EXISTS, and it is worth the paragraph. The probe generates a key
 * pair and writes the public half into the scratch server's authorized keys, so
 * the server will accept that key and nothing else. It then never gave the
 * client any way to use the private half. The client offered whatever the
 * operator's own setup offers, the server refused all of it, and the run
 * reported `auth-refused` in 366 ms. Steps 4, 5 and 6 then failed with "there
 * is no machines.json to edit", because step 4 never got far enough to write
 * one. Four red steps, one cause.
 *
 * The holder is private to this run: its own socket in the scratch directory,
 * its own pid, killed at teardown. `SSH_AUTH_SOCK` is handed to the app, and
 * from there to the client, so the operator's own holder is not consulted and
 * none of their keys is offered.
 *
 * Returns the socket path, or '' when a holder could not be started.
 */
function startPrivateKeyHolder(userKey) {
  const sock = join(scratch, 'p68-agent.sock');
  // A unix socket path is limited to about 104 characters, so the socket lives
  // in the scratch directory under the system temporary directory, which is
  // short, rather than beside this file.
  if (sock.length > 100) {
    console.log(`[p68] the key holder socket path is ${String(sock.length)} characters, which is too long`);
    return '';
  }
  try {
    const out = run('/usr/bin/ssh-agent', ['-a', sock]);
    const pid = Number(/SSH_AGENT_PID=(\d+)/.exec(out)?.[1] ?? '0');
    if (pid > 0) recordedPids.push(pid);
    run('/usr/bin/ssh-add', [userKey], { env: { ...process.env, SSH_AUTH_SOCK: sock } });
    const listed = run('/usr/bin/ssh-add', ['-l'], {
      env: { ...process.env, SSH_AUTH_SOCK: sock }
    });
    const keys = listed.trim().split('\n').filter((l) => l.trim() !== '').length;
    console.log(`[p68] a private key holder is up with ${String(keys)} key in it`);
    return keys === 1 ? sock : '';
  } catch (err) {
    console.log(`[p68] could not start a private key holder: ${err.message}`);
    return '';
  }
}

/**
 * The scripted stand in, used only when a non root sshd cannot start.
 *
 * It prints the host key question the way a real client does, waits for the
 * answer on its own terminal, then prints the marker pair. It proves what
 * Tortie does with those bytes. It proves nothing about ssh.
 */
function writeSshStandIn() {
  const path = join(scratch, 'p68-ssh-stand-in');
  writeFileSync(
    path,
    [
      '#!/usr/bin/env node',
      '// Scratch stand in for ssh. Started only by build/probe-machines.mjs.',
      "const args = process.argv.slice(2);",
      "const wantsAlarm = process.env['P68_STAND_IN_MODE'] === 'host-key-changed';",
      "const wantsRefused = process.env['P68_STAND_IN_MODE'] === 'refused';",
      'if (wantsRefused) {',
      "  process.stdout.write('ssh: connect to host 127.0.0.1 port 1 : Connection refused\\r\\n');",
      '  process.exit(255);',
      '}',
      'if (wantsAlarm) {',
      "  process.stdout.write('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\\r\\n');",
      "  process.stdout.write('@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @\\r\\n');",
      "  process.stdout.write('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\\r\\n');",
      "  process.stdout.write('Host key verification failed.\\r\\n');",
      '  process.exit(255);',
      '}',
      "process.stdout.write('The authenticity of host \\'127.0.0.1\\' cannot be established.\\r\\n');",
      "process.stdout.write('Are you sure you want to continue connecting (yes/no)? ');",
      "let seen = '';",
      "process.stdin.setEncoding('utf8');",
      "process.stdin.on('data', (chunk) => {",
      '  seen += chunk;',
      "  if (!seen.includes('\\r') && !seen.includes('\\n')) return;",
      "  process.stdout.write('\\r\\nWarning: Permanently added \\'127.0.0.1\\' to the list of known hosts.\\r\\n');",
      "  const command = args[args.length - 1] ?? '';",
      "  const match = /command -v (\\S+)/.exec(command);",
      "  const asked = (match && match[1]) ? match[1].replace(/'/g, '') : 'tmux';",
      "  const answer = asked.startsWith('/') ? asked : '/usr/bin/tmux';",
      "  process.stdout.write('__TORTIE_PATH__' + answer + '__TORTIE_PATH__\\r\\n');",
      '  process.exit(0);',
      '});'
    ].join('\n') + '\n',
    'utf8'
  );
  chmodSync(path, 0o755);
  return path;
}

// ---------------------------------------------------------------------------
// Driving the real Settings window
// ---------------------------------------------------------------------------

/**
 * Launch the app once, run one driver expression in the Settings window, take
 * one screenshot, and return what the driver printed.
 *
 * The profile is the same directory every time, so a machine written in one
 * step is still there in the next one.
 */
function driveSettings({ shot, js, env = {}, timeoutMs = 90_000 }) {
  return new Promise((resolvedrive) => {
    const child = spawn(
      'npx',
      ['electron', '.', `--user-data-dir=${profile}`, '-ApplePersistenceIgnoreState', 'YES'],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          GMUX_SHOT: shot,
          GMUX_SHOT_SETTINGS: '1',
          GMUX_SHOT_SETTINGS_JS: js,
          GMUX_TMUX_SOCKET: 'gmux-p68-probe',
          // The private key holder this run started, holding one scratch key.
          // Without it the client has nothing the scratch server accepts.
          ...(agentSocket === '' ? {} : { SSH_AUTH_SOCK: agentSocket }),
          ...env
        },
        stdio: ['ignore', 'pipe', 'pipe']
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
      killRecorded(child.pid);
    }, timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(timer);
      const line = out.split('\n').find((l) => l.includes('[gmux-shot] driver')) ?? '';
      const payload = line.slice(line.indexOf('driver') + 8).trim();
      let parsed = null;
      try {
        parsed = JSON.parse(payload.replace(/^→\s*/, ''));
      } catch {
        parsed = null;
      }
      resolvedrive({ code, out, payload, parsed, pid: child.pid });
    });
  });
}

/**
 * A driver expression that returns JSON.
 *
 * `body` is JavaScript that runs inside the Settings renderer with the real
 * preload in place. It must return an object. Everything it needs about the
 * page it reads from the DOM, and everything it needs from main it asks for
 * through `window.gmux.machines`, which is the same object the buttons use.
 */
function driver(body) {
  return `(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const text = () => document.body.innerText || '';
    const findByText = (needle) => {
      const nodes = Array.from(document.querySelectorAll('button, [role="button"], a'));
      return nodes.find((n) => (n.textContent || '').trim().includes(needle)) || null;
    };
    const clickByText = async (needle) => {
      const node = findByText(needle);
      if (node === null) return false;
      node.click();
      await wait(400);
      return true;
    };
    const openMachines = async () => {
      // PHASE 79 deleted "No machines yet.". The caption is drawn on this
      // section whether or not a machine has been added, so it is the sentinel
      // now, and the Add button stays as the second one.
      if (
        text().includes('Tortie can keep your work running on another machine you own.') ||
        text().includes('Add a machine')
      ) return 'already';
      const rail = Array.from(document.querySelectorAll('button, [role="tab"], li, a'))
        .find((n) => (n.textContent || '').trim() === 'Machines');
      if (rail === null || rail === undefined) return 'not-found';
      rail.click();
      await wait(600);
      return 'clicked';
    };

    // ----------------------------------------------------------------------
    // Driving the real controls
    // ----------------------------------------------------------------------
    //
    // A React input owns its value, so assigning to .value and firing an event
    // changes the pixels and not the state behind them. The prototype setter
    // below is the one way to type into a controlled field from outside, and
    // it is what makes these steps a person pressing keys rather than a script
    // calling a store.
    const type = (selector, value) => {
      const el = document.querySelector(selector);
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
      const el = document.querySelector('[data-machines-action="' + name + '"]');
      if (el === null) return false;
      if (el.disabled === true) return 'disabled';
      el.click();
      await wait(400);
      return true;
    };
    const isDisabled = (name) => {
      const el = document.querySelector('[data-machines-action="' + name + '"]');
      return el === null ? null : el.disabled === true;
    };
    const openAdvanced = () => {
      const d = document.querySelector('details.mach-advanced');
      if (d !== null) d.open = true;
    };
    /** Wait until a selector exists, up to ms. Answers with the element or null. */
    const until = async (selector, ms) => {
      const deadline = Date.now() + ms;
      for (;;) {
        const el = document.querySelector(selector);
        if (el !== null) return el;
        if (Date.now() > deadline) return null;
        await wait(150);
      }
    };
    /** Put an element in the middle of the window, so a screenshot shows it. */
    const show = (selector) => {
      const el = document.querySelector(selector);
      if (el === null) return false;
      el.scrollIntoView({ block: 'center' });
      return true;
    };
    /** The transcript on screen, which is the program's own bytes. */
    const transcriptOnScreen = () => {
      const el = document.querySelector('[data-machines-transcript]');
      return el === null ? '' : el.textContent || '';
    };
    /**
     * Fill the Add form and press Test the connection, then answer the host
     * key question on screen if the program asks it. Every step is a control.
     */
    const runTestByButton = async (host, port, label, program) => {
      await act('open-add');
      field('host', host);
      field('label', label);
      openAdvanced();
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
        if (document.querySelector('[data-outcome-class]') !== null) break;
        await wait(200);
      }
      const outcomeEl = document.querySelector('[data-outcome-class]');
      return {
        started,
        answered,
        outcomeClass: outcomeEl === null ? null : outcomeEl.getAttribute('data-outcome-class'),
        alarmDrawn:
          outcomeEl !== null && (outcomeEl.className || '').includes('alarm'),
        transcriptBytes: transcriptOnScreen().length
      };
    };
    /** The lines drawn under the transcript, which are what a person agrees to. */
    const sheetOnScreen = () =>
      Array.from(document.querySelectorAll('.mach-sheet .set-config-lines li')).map(
        (n) => (n.textContent || '').trim()
      );

    const m = () => window.gmux && window.gmux.machines;
    try {
      const result = await (async () => { ${body} })();
      return JSON.stringify(result);
    } catch (err) {
      return JSON.stringify({ error: String(err && err.message ? err.message : err) });
    }
  })()`;
}

// ---------------------------------------------------------------------------
// The steps
// ---------------------------------------------------------------------------

const HONESTY_ONE =
  'Tortie never adopts work that is already running on your machines';
// The second sentence of MACHINE_PATH_HONESTY in src/main/machines/confirm.ts,
// copied because a probe cannot import TypeScript. It must match that constant
// word for word. If it does not, step 1 asserts the absence of a string that is
// nowhere in the product, which cannot fail and measures nothing.
const HONESTY_THREE = 'It can never seal the bytes of that program.';

/**
 * PHASE 79 rewrote what step 1 measures, and this is why.
 *
 * Phase 68 drew four honesty lines and an empty line on the Machines section
 * before a person had added anything. Step 1 asserted all of them were there.
 * Phase 79 emptied that screen down to a heading, one sentence and one button.
 * `HONESTY_TWO` is gone from the product, because Phase 70 shipped sessions on
 * another machine and the sentence was false. `HONESTY_ONE` moved onto the
 * machine row above Prepare, and main's honesty line is drawn per row, so
 * neither is on the empty screen any more.
 *
 * Step 1 now asserts the opposite of what it used to: the caption and the
 * button are there, and the five sentences that used to crowd the empty screen
 * are not. Step 4 checks that the disclosure appears once a row exists, and
 * step 11 checks that `HONESTY_ONE` is on the prepared row.
 */
const SECTION_CAPTION =
  'Tortie can keep your work running on another machine you own.';
const RETIRED_EMPTY_LINE = 'No machines yet.';
const RETIRED_NO_SESSIONS = 'You cannot open a session on a machine yet.';
const DISCLOSURE_LABEL = 'How Tortie treats your machines';

async function step1Empty() {
  const shot = join(outDir, 'p68-machines-empty.png');
  const res = await driveSettings({
    shot,
    js: driver(`
      const opened = await openMachines();
      const body = text();
      const addButton = findByText('Add a machine');
      return {
        opened,
        railFound: opened !== 'not-found',
        caption: body.includes(${JSON.stringify(SECTION_CAPTION)}),
        addButton: addButton !== null,
        retiredEmptyLine: body.includes(${JSON.stringify(RETIRED_EMPTY_LINE)}),
        retiredNoSessions: body.includes(${JSON.stringify(RETIRED_NO_SESSIONS)}),
        honestyOne: body.includes(${JSON.stringify(HONESTY_ONE)}),
        honestyThree: body.includes(${JSON.stringify(HONESTY_THREE)}),
        disclosure: body.includes(${JSON.stringify(DISCLOSURE_LABEL)}),
        bridge: typeof (m() || {}).rows === 'function'
      };
    `)
  });
  const d = res.parsed;
  const ok =
    d !== null &&
    d.caption === true &&
    d.addButton === true &&
    d.retiredEmptyLine === false &&
    d.retiredNoSessions === false &&
    d.honestyOne === false &&
    d.honestyThree === false &&
    d.disclosure === false;
  note(
    1,
    'Settings, Machines, with nothing added',
    ok ? 'pass' : 'FAIL',
    `driven by button. PHASE 79 turned this step around. The empty screen must ` +
      `be a heading, one sentence and one button, so the caption ` +
      `${String(d?.caption)} and the Add button ${String(d?.addButton)} must both ` +
      `be there, and everything that used to crowd it must not be. The retired ` +
      `empty line ${String(d?.retiredEmptyLine)}, the retired sessions sentence ` +
      `${String(d?.retiredNoSessions)}, the no adoption line ` +
      `${String(d?.honestyOne)}, main's honesty line ${String(d?.honestyThree)}, ` +
      `the disclosure ${String(d?.disclosure)}, and every one of those five is a ` +
      `failure if it is true. Bridge present ${String(d?.bridge)}. ` +
      `Screenshot ${shot}`
  );
  return ok;
}

async function step2AddMachine() {
  const shot = join(outDir, 'p68-add-machine.png');
  const res = await driveSettings({
    shot,
    js: driver(`
      await openMachines();
      const clicked = await clickByText('Add a machine');
      const source = await (m() ? m().tailscaleNames() : Promise.resolve(null));
      const body = text();
      return {
        clicked,
        binary: source ? source.binary : null,
        sourceKind: source ? source.source : null,
        note: source ? source.note : null,
        peerCount: source ? source.peers.length : 0,
        pathOnScreen: source && source.binary ? body.includes(source.binary) : null,
        missingSentence: body.includes('Tortie found no Tailscale program')
      };
    `)
  });
  const d = res.parsed;
  // Either a path is printed, or the plain no Tailscale sentence is. Both are a
  // pass, and the report says which one this machine produced.
  const ok =
    d !== null &&
    ((typeof d.binary === 'string' && d.binary.startsWith('/')) ||
      d.sourceKind === 'missing');
  note(
    2,
    'Add a machine, and where the picker reads from',
    ok ? 'pass' : 'FAIL',
    `driven by button. Tailscale ${String(d?.sourceKind)}, path ${String(d?.binary)}, ` +
      `peers ${String(d?.peerCount)}, note ${JSON.stringify(d?.note ?? null)}. ` +
      `Screenshot ${shot}`
  );
  return ok;
}

/**
 * Step 3. The one visible connection test, driven by the controls a person
 * uses, so the photograph shows the view they would be looking at.
 *
 * Every part of this is a control. The address goes into the address field, the
 * port into the port field under Advanced, the test starts because Test the
 * connection was pressed, and the host key question is answered by typing into
 * the answer field and pressing Send. The event stream is subscribed to as well,
 * but only to MEASURE. Nothing here is caused by that subscription.
 *
 * PHASE 73.1 added two reads and one clause to the verdict. The transcript a
 * person reads must NOT contain Tortie's own marker, and it must contain the
 * resolved path. Both reads are scoped to the transcript element. The marker
 * is still in the header's command tooltip and in the data-command-line
 * attribute, on purpose, because those carry the exact command Tortie runs and
 * editing them would make the line false.
 */
async function step3Test(env) {
  const shot = join(outDir, 'p68-connection-test.png');
  const started = Date.now();
  const res = await driveSettings({
    shot,
    env,
    js: driver(`
      await openMachines();
      const events = [];
      const off = m().onTestEvent((e) => { events.push(e); });
      const t0 = Date.now();
      const drove = await runTestByButton(
        '127.0.0.1',
        ${sshdPort || 22},
        'Scratch box',
        ${JSON.stringify(remoteProgram)}
      );
      off();
      const end = events.find((e) => e.kind === 'end');
      const first = events[0] || null;
      const resolved =
        end && end.outcome && typeof end.outcome.resolvedPath === 'string'
          ? end.outcome.resolvedPath
          : null;
      show('.mach-test');
      await wait(400);
      return {
        drove,
        outcome: end ? end.outcome : null,
        sheetOnScreen: sheetOnScreen(),
        addButtonDisabled: isDisabled('add-confirm'),
        durationMs: Date.now() - t0,
        testIdSeen: first ? first.testId : null,
        commandLineOnScreen: (() => {
          const el = document.querySelector('[data-command-line]');
          return el === null ? null : el.getAttribute('data-command-line');
        })(),
        headerOnScreen:
          text().includes('Tortie is running:') &&
          text().includes('Everything below this line comes from that program'),
        transcriptOnScreenHead: transcriptOnScreen().slice(0, 400),
        // Phase 73.1, row 1. Read the TRANSCRIPT ELEMENT ONLY. The whole
        // document still carries the marker inside the command tooltip and
        // the data-command-line attribute, and that is deliberate, because
        // those hold the exact command Tortie runs.
        markerOnScreen: transcriptOnScreen().includes('__TORTIE_PATH__'),
        pathOnScreen:
          resolved !== null &&
          resolved.length > 0 &&
          transcriptOnScreen().includes(resolved)
      };
    `)
  });
  const d = res.parsed;
  const ok =
    d !== null &&
    d.outcome !== null &&
    d.outcome.class === 'ok' &&
    d.drove.outcomeClass === 'ok' &&
    d.headerOnScreen === true &&
    Array.isArray(d.sheetOnScreen) &&
    d.sheetOnScreen.length >= 2 &&
    typeof d.outcome.resolvedPath === 'string' &&
    d.outcome.resolvedPath.startsWith('/') &&
    d.markerOnScreen === false &&
    d.pathOnScreen === true;
  note(
    3,
    'the one visible connection test',
    ok ? 'pass' : 'FAIL',
    `driven by button, every field typed and every control clicked. carriage ` +
      `${carriage}. host key question answered ${String(d?.drove?.answered)}, ` +
      `outcome on screen ${String(d?.drove?.outcomeClass)}, path ` +
      `${String(d?.outcome?.resolvedPath)}, ` +
      `${String(d?.outcome?.durationMs ?? Date.now() - started)} ms, ` +
      `${String(d?.drove?.transcriptBytes)} bytes of transcript on screen, header ` +
      `lines on screen ${String(d?.headerOnScreen)}, sheet on screen ` +
      `${JSON.stringify(d?.sheetOnScreen ?? null)}, add button disabled ` +
      `${String(d?.addButtonDisabled)}. The command a person can read names ` +
      `${JSON.stringify(d?.commandLineOnScreen ?? null)}. ` +
      `the marker is on screen: ${String(d?.markerOnScreen)}, and the resolved ` +
      `path is in the transcript: ${String(d?.pathOnScreen)}. Screenshot ${shot}`
  );
  return { ok, resolvedPath: d?.outcome?.resolvedPath ?? null };
}

/**
 * Step 4. Add the machine and confirm it, by pressing the button a person
 * presses, and prove a STALE sheet is refused.
 *
 * THIS IS THE STEP THE LAST ROUND SHIPPED BROKEN. The button was drawn and
 * enabled and the call under it sent an empty hash, so main refused every add
 * with "the machine changed after it was shown" and the list still read "No
 * machines yet." The bridge path worked, because the bridge was handed the hash
 * main had composed. So this step now presses the button. A run that only calls
 * the bridge cannot see that failure at all.
 *
 * The stale attempt runs afterwards, over the bridge, because there is no way
 * to make a sheet stale from the screen. It carries its own machine id, so a
 * refusal is proven by the file still holding exactly the one row the button
 * added.
 */
async function step4Confirm(env) {
  const shot = join(outDir, 'p68-confirmed.png');
  const res = await driveSettings({
    shot,
    env,
    js: driver(`
      await openMachines();
      const before = await m().rows();
      const drove = await runTestByButton(
        '127.0.0.1',
        ${sshdPort || 22},
        'Scratch box',
        ${JSON.stringify(remoteProgram)}
      );
      const sheetDrawn = sheetOnScreen();
      const buttonWasEnabled = isDisabled('add-confirm') === false;
      const clicked = await act('add-confirm');
      await wait(1200);
      const listed = await m().rows();
      const errorOnScreen = (() => {
        const el = document.querySelector('.set-row-error');
        return el === null ? null : (el.textContent || '').trim();
      })();

      // The stale case, which no control on the screen can produce.
      let staleError = null;
      try {
        await m().add({
          id: 'stale-one',
          label: 'Stale',
          color: 'red',
          host: '127.0.0.1',
          user: null,
          port: ${sshdPort || 22},
          remoteTmuxPath: '/usr/bin/tmux',
          hashRead: 'a hash from an older sheet',
          linesRead: sheetDrawn
        });
      } catch (err) {
        staleError = String(err && err.message ? err.message : err);
      }
      const afterStale = await m().rows();
      show('.set-card');
      await wait(300);
      return {
        startedEmpty: before.rows.length === 0,
        outcomeClass: drove.outcomeClass,
        sheetDrawn,
        buttonWasEnabled,
        clicked,
        errorOnScreen,
        rows: listed.rows.map((r) => ({ id: r.id, state: r.state, path: r.remoteTmuxPath, label: r.label })),
        rowOnScreen: text().includes('Scratch box'),
        confirmedChipOnScreen: text().includes('Confirmed'),
        // PHASE 79. "No machines yet." is gone from the product, so asking
        // whether it is still on screen can no longer fail. The disclosure is
        // the line that is drawn only once a row exists, so it is what proves
        // the screen left its empty state.
        disclosureOnScreen: text().includes(${JSON.stringify(DISCLOSURE_LABEL)}),
        staleError,
        rowsAfterStale: afterStale.rows.map((r) => r.id),
        filePath: listed.path
      };
    `)
  });
  const d = res.parsed;
  const staleRefused =
    d !== null && typeof d.staleError === 'string' && d.staleError.includes('changed after it');
  const added = d !== null && Array.isArray(d.rows) && d.rows.length === 1;
  const confirmed = added && d.rows[0].state === 'confirmed';
  const wroteNothingOnStale =
    d !== null && Array.isArray(d.rowsAfterStale) && d.rowsAfterStale.length === 1;
  const ok =
    d !== null &&
    d.buttonWasEnabled === true &&
    d.clicked === true &&
    confirmed &&
    d.rowOnScreen === true &&
    d.disclosureOnScreen === true &&
    staleRefused &&
    wroteNothingOnStale;

  // The file on disk must hold the path the MACHINE reported.
  let onDisk = null;
  const machinesJson = join(profile, 'gmux', 'config', 'machines.json');
  if (existsSync(machinesJson)) onDisk = readFileSync(machinesJson, 'utf8');

  note(
    4,
    'add and confirm by pressing the button, and a stale sheet refuses',
    ok ? 'pass' : 'FAIL',
    `driven by button. sheet on screen ${JSON.stringify(d?.sheetDrawn ?? null)}, button ` +
      `enabled ${String(d?.buttonWasEnabled)}, clicked ${String(d?.clicked)}, error under ` +
      `the button ${JSON.stringify(d?.errorOnScreen ?? null)}, rows after the click ` +
      `${JSON.stringify(d?.rows ?? null)}, the row is on screen ` +
      `${String(d?.rowOnScreen)}, the screen left its empty state and drew the ` +
      `disclosure ${String(d?.disclosureOnScreen)}. Stale sheet refused ` +
      `${String(staleRefused)} and wrote nothing ${String(wroteNothingOnStale)}. ` +
      `machines.json on disk: ` +
      `${JSON.stringify((onDisk ?? '').replace(/\s+/g, ' ').slice(0, 240))}. Screenshot ${shot}`
  );
  return ok;
}

/**
 * Step 5. Change the address from OUTSIDE the app, and measure how long the
 * watcher takes to make the row unusable.
 *
 * The write happens while the app is up. The driver polls what main holds in
 * memory, which is what the watcher writes into, so the number measured is the
 * time from the write landing to Tortie knowing about it.
 */
async function step5WatcherChange() {
  const shot = join(outDir, 'p68-changed.png');
  const machinesJson = join(profile, 'gmux', 'config', 'machines.json');
  if (!existsSync(machinesJson)) {
    note(5, 'an edit from outside makes the row unusable', 'FAIL', 'there is no machines.json to edit');
    return false;
  }
  const original = readFileSync(machinesJson, 'utf8');
  let wroteAt = 0;
  const pending = driveSettings({
    shot,
    js: driver(`
      await openMachines();
      const deadline = Date.now() + 40000;
      let seen = null;
      while (Date.now() < deadline) {
        const listed = await m().rows();
        const row = listed.rows.find((r) => r.id === 'scratch-box');
        if (row && row.state === 'changed') {
          seen = { at: Date.now(), refusal: row.refusal, confirmedLines: row.confirmedLines, lines: row.lines };
          break;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      await wait(500);
      // Main knows. The window does not, because nothing pushes a file change
      // to it, so the person asks Tortie to look again. That is what the button
      // in the toolbar is for and it is why it is always drawn.
      const listBeforeReload = {
        chip: text().includes('Not usable'),
        bothLists: text().includes('You confirmed:') && text().includes('It now says:')
      };
      const reloaded = await act('reload');
      await wait(800);
      show('.mach-row');
      await wait(300);
      return {
        seen,
        listBeforeReload,
        reloaded,
        bodyHasBothLists:
          text().includes('You confirmed:') && text().includes('It now says:'),
        chipOnScreen: text().includes('Not usable')
      };
    `)
  });
  // Give the window time to be up, then write from outside.
  await sleep(9_000);
  const moved = original.replace('"host": "127.0.0.1"', '"host": "127.0.0.2"');
  writeFileSync(machinesJson, moved, 'utf8');
  wroteAt = Date.now();
  const res = await pending;
  const d = res.parsed;
  const ok =
    d !== null && d.seen !== null && typeof d.seen.refusal === 'string' &&
    d.seen.refusal.includes('details changed') &&
    // A row that stops being usable while a person is looking at it has to
    // SHOW what changed. This assertion is why the row now opens itself on
    // that transition: the run before it measured the state change at 333 ms
    // and both lists were still behind the disclosure.
    d.bodyHasBothLists === true &&
    d.chipOnScreen === true;
  const delta = d?.seen?.at !== undefined ? d.seen.at - wroteAt : null;
  const timing =
    delta === null
      ? 'the change was never observed'
      : `${String(delta)} ms from the write landing to the state change`;
  note(
    5,
    'an edit from outside makes the row unusable, and how fast',
    ok ? 'pass' : 'FAIL',
    `main was polled over the bridge and the screen was read and clicked. ` +
      `${timing}. Refusal ${JSON.stringify(d?.seen?.refusal ?? null)}. Before ` +
      `Check the file again was pressed the screen showed the chip ` +
      `${String(d?.listBeforeReload?.chip)} and both lists ` +
      `${String(d?.listBeforeReload?.bothLists)}, because nothing pushes a file ` +
      `change to the window. After the click, chip ${String(d?.chipOnScreen)} ` +
      `and both lists ${String(d?.bodyHasBothLists)}. Screenshot ${shot}`
  );
  // Put the address back so step 6 measures a label change on a confirmed row.
  writeFileSync(machinesJson, original, 'utf8');
  return ok;
}

/** Step 6. A label change alone leaves the confirmation exactly where it was. */
async function step6LabelOnly() {
  const machinesJson = join(profile, 'gmux', 'config', 'machines.json');
  if (!existsSync(machinesJson)) {
    note(6, 'a label change alone changes nothing', 'FAIL', 'there is no machines.json to edit');
    return false;
  }
  const original = readFileSync(machinesJson, 'utf8');
  const pending = driveSettings({
    shot: join(outDir, 'p68-label-only.png'),
    js: driver(`
      await openMachines();
      const first = await m().rows();
      const before = first.rows.find((r) => r.id === 'scratch-box');
      const deadline = Date.now() + 30000;
      let after = null;
      while (Date.now() < deadline) {
        const listed = await m().rows();
        const row = listed.rows.find((r) => r.id === 'scratch-box');
        if (row && row.label === 'Renamed By Hand') { after = row; break; }
        await new Promise((r) => setTimeout(r, 100));
      }
      return {
        beforeState: before ? before.state : null,
        beforeHash: before ? before.hash : null,
        afterState: after ? after.state : null,
        afterHash: after ? after.hash : null
      };
    `)
  });
  await sleep(9_000);
  writeFileSync(
    machinesJson,
    original.replace('"label": "Scratch box"', '"label": "Renamed By Hand"'),
    'utf8'
  );
  const res = await pending;
  const d = res.parsed;
  const ok =
    d !== null &&
    d.afterState === 'confirmed' &&
    d.afterHash !== null &&
    d.afterHash === d.beforeHash;
  note(
    6,
    'a label change alone leaves the confirmation and the hash where they were',
    ok ? 'pass' : 'FAIL',
    `driven by bridge. before ${String(d?.beforeState)} ${String(d?.beforeHash).slice(0, 12)}, ` +
      `after ${String(d?.afterState)} ${String(d?.afterHash).slice(0, 12)}`
  );
  writeFileSync(machinesJson, original, 'utf8');
  return ok;
}

async function step7Refused() {
  const port = await freePort();
  const res = await driveSettings({
    shot: join(outDir, 'p68-refused.png'),
    env: { P68_STAND_IN_MODE: 'refused' },
    js: driver(`
      await openMachines();
      const events = [];
      const off = m().onTestEvent((e) => { events.push(e); });
      const started = await m().test({
        mode: 'draft',
        draft: { host: '127.0.0.1', user: null, port: ${port}, remoteTmuxPath: null }
      });
      void started;
      let outcome = null;
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        const end = events.find((e) => e.kind === 'end');
        if (end) { outcome = end.outcome; break; }
        await new Promise((r) => setTimeout(r, 200));
      }
      off();
      return { outcome };
    `)
  });
  const d = res.parsed;
  const ok = d?.outcome?.class === 'refused' && d.outcome.alarm === false;
  note(
    7,
    'a port with nothing on it is calm, not alarming',
    ok ? 'pass' : 'FAIL',
    `driven by bridge. class ${String(d?.outcome?.class)}, alarm ` +
      `${String(d?.outcome?.alarm)}, headline ${JSON.stringify(d?.outcome?.headline ?? null)}`
  );
  return ok;
}

/**
 * Step 8. A changed host key wears the alarm, and the photograph shows it.
 *
 * The last round drove this over the bridge, so the connection test view was
 * never mounted and the alarm was never drawn. The screenshot was of an empty
 * section, and the step's own detail said so in the same breath as its caption
 * claimed otherwise. It is driven by the controls now, and the alarm block is
 * scrolled into the middle of the window before the capture.
 */
async function step8HostKeyChanged(standIn) {
  const shot = join(outDir, 'p68-host-key-changed.png');
  const res = await driveSettings({
    shot,
    env: { GMUX_SSH_BIN: standIn, P68_STAND_IN_MODE: 'host-key-changed' },
    js: driver(`
      await openMachines();
      const events = [];
      const off = m().onTestEvent((e) => { events.push(e); });
      const drove = await runTestByButton('127.0.0.1', ${sshdPort || 22}, 'Changed key', '');
      off();
      const end = events.find((e) => e.kind === 'end');
      show('.mach-outcome');
      await wait(500);
      const body = text();
      const outcomeEl = document.querySelector('[data-outcome-class]');
      const box = outcomeEl === null ? null : outcomeEl.getBoundingClientRect();
      return {
        drove,
        outcome: end ? end.outcome : null,
        alarmAttributeOnScreen:
          (document.querySelector('.mach-test') || {}).getAttribute
            ? document.querySelector('.mach-test').getAttribute('data-alarm')
            : null,
        alarmClassOnScreen: drove.alarmDrawn,
        alarmCopyOnScreen: body.includes('The identity of this machine changed.'),
        calmCopyOnScreen: body.includes('Tortie could not reach this machine.'),
        inShot:
          box !== null && box.top >= 0 && box.bottom <= window.innerHeight && box.height > 0,
        viewportHeight: window.innerHeight
      };
    `)
  });
  const d = res.parsed;
  const ok =
    d?.outcome?.class === 'host-key-changed' &&
    d.outcome.alarm === true &&
    d.alarmCopyOnScreen === true &&
    d.alarmAttributeOnScreen === 'yes' &&
    d.alarmClassOnScreen === true &&
    d.inShot === true &&
    d.calmCopyOnScreen !== true;
  note(
    8,
    'a changed host key draws the alarm state and never the calm copy',
    ok ? 'pass' : 'FAIL',
    `driven by button, against the scripted stand in so the case can be produced ` +
      `on demand. class ${String(d?.outcome?.class)}, alarm ${String(d?.outcome?.alarm)}, ` +
      `alarm attribute on screen ${String(d?.alarmAttributeOnScreen)}, alarm styling ` +
      `${String(d?.alarmClassOnScreen)}, alarm copy on screen ` +
      `${String(d?.alarmCopyOnScreen)}, calm copy on screen ` +
      `${String(d?.calmCopyOnScreen)}, the alarm block is inside the ` +
      `${String(d?.viewportHeight)} px the capture photographs ${String(d?.inShot)}. ` +
      `Screenshot ${shot}`
  );
  return ok;
}

async function step9QuitWithTestRunning(standIn) {
  // A test that hangs, so there is something to kill. The stand in waits on its
  // own terminal for an answer nobody sends.
  const res = await driveSettings({
    shot: join(outDir, 'p68-quit-with-test.png'),
    env: { GMUX_SSH_BIN: standIn },
    js: driver(`
      await openMachines();
      const started = await m().test({
        mode: 'draft',
        draft: { host: '127.0.0.1', user: null, port: ${sshdPort || 22}, remoteTmuxPath: null }
      });
      await new Promise((r) => setTimeout(r, 1500));
      return { testId: started.testId };
    `)
  });
  // The app has exited by now. Any stand in it started must be gone with it.
  await sleep(1_000);
  let survivors = '';
  try {
    survivors = run('/bin/ps', ['-o', 'pid=,command=']);
  } catch {
    survivors = '';
  }
  const leftOver = survivors
    .split('\n')
    .filter((line) => line.includes('p68-ssh-stand-in'))
    .map((line) => line.trim());
  const ok = leftOver.length === 0;
  note(
    9,
    'the client dies with the app',
    ok ? 'pass' : 'FAIL',
    `driven by bridge. after the app exited, ${String(leftOver.length)} stand in ` +
      `process(es) were left: ${JSON.stringify(leftOver)}. driver said ` +
      `${String(res.payload).slice(0, 80)}`
  );
  return ok;
}

// ---------------------------------------------------------------------------
// Phase 69. The two photographs of Prepare, both taken by pressing the button
// ---------------------------------------------------------------------------
//
// WHY THESE ARE HERE AND NOT IN A PROBE OF THEIR OWN. Everything they need
// already exists in this file: a real sshd on loopback, an agent holding a
// scratch key, a driver that types into the real fields and clicks the real
// controls, and a machine confirmed in step 4 through the real gate. A second
// probe would have copied all of it.
//
// WHY THEY PRESS THE BUTTON. Phase 68's fix round found three screenshots that
// were the same photograph of an empty section, because the steps went through
// the bridge and the view was never mounted. So each of these clicks
// `[data-machines-action="prepare"]` inside a named row, waits for the result
// block to appear, and reads what is on the screen back out of the DOM.

/**
 * Print why a driver returned nothing.
 *
 * A step whose driver threw reported every field as null, which reads exactly
 * like a surface that drew nothing. This prints the tail of what the child said,
 * so the next reader sees the error instead of guessing at it.
 */
function sayWhyNoAnswer(step, res) {
  if (res.parsed !== null) return;
  const tail = String(res.out).split('\n').slice(-25).join('\n');
  console.log(
    `[p68] step ${String(step)}: the driver returned nothing. The payload was ` +
      `${JSON.stringify(res.payload)}. The last lines the child printed:\n${tail}`
  );
}

/** A program that reports a version nobody has measured. */
function writeMadeUpVersionProgram() {
  const path = join(scratch, 'p69-stub-tmux');
  writeFileSync(path, '#!/bin/sh\necho "tmux 0.0-p69-made-up"\nexit 0\n', 'utf8');
  chmodSync(path, 0o755);
  return path;
}

/**
 * Step 11. A prepared machine row, photographed.
 *
 * The machine is the one step 4 confirmed, so the identity record file already
 * holds this machine's key from the one visible test, which is the production
 * path. Prepare is pressed, and the row then draws the version the machine
 * reported, the table of settings Tortie asserted, and the two honesty lines.
 */
async function step11PreparePhoto(env) {
  const shot = join(outDir, 'p69-prepared.png');
  // End the SCRATCH server on the far side first, so this step measures a birth
  // rather than a server an earlier run left behind. The socket name here is the
  // scratch one this probe launches with, never `gmux`, and that is asserted by
  // the name itself being a literal below rather than a variable.
  let born = 'the scratch server was already gone';
  try {
    execFileSync('tmux', ['-L', 'gmux-p68-probe', 'kill-server'], {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    born = 'the scratch server from an earlier run was ended first';
  } catch {
    /* no server is the state this step wants */
  }
  const res = await driveSettings({
    shot,
    env,
    timeoutMs: 120_000,
    js: driver(`
      // A trail, so a step that stops somewhere says WHERE. The first build of
      // this step returned nothing at all and read as a surface that drew
      // nothing, which cost an hour of guessing.
      const trail = [];
      trail.push('opening');
      await openMachines();
      trail.push('opened');
      const rows = await m().rows();
      trail.push('rows:' + String(rows.rows.length));
      const id = rows.rows.length > 0 ? rows.rows[0].id : null;
      // Prepare lives inside the row's detail section, which is collapsed until a
      // person presses Show. So this presses Show first, which is what they do.
      const toggle = id === null
        ? null
        : document.querySelector('[data-machine-id="' + id + '"] [data-machines-action="toggle-lines"]');
      if (toggle !== null) { toggle.click(); await wait(400); }
      trail.push('expanded:' + String(toggle !== null));
      const button = id === null
        ? null
        : document.querySelector('[data-machine-id="' + id + '"] [data-machines-action="prepare"]');
      const buttonLabel = button === null ? null : (button.textContent || '').trim();
      const wasEnabled = button === null ? null : button.disabled === false;
      trail.push('button:' + String(buttonLabel) + ':enabled:' + String(wasEnabled));
      if (button !== null && button.disabled === false) button.click();
      trail.push('clicked');
      const block = await until('.mach-prepare-result', 60000);
      trail.push('block:' + String(block !== null));
      await wait(600);
      const read = (sel) => {
        const el = document.querySelector(sel);
        return el === null ? null : (el.textContent || '').trim();
      };
      show('.mach-row');
      await wait(400);
      return {
        trail,
        id,
        buttonLabel,
        wasEnabled,
        drewBlock: block !== null,
        drawnClass: block === null ? null : block.getAttribute('data-prepare-class'),
        drawnAlarm: block === null ? null : block.getAttribute('data-prepare-alarm'),
        headline: read('.mach-prepare-headline'),
        detail: read('.mach-prepare-detail'),
        version: read('[data-prepare-version]'),
        optionRows: document.querySelectorAll('[data-prepare-option]').length,
        settingsLabelOnScreen: text().includes('Settings Tortie asserted:'),
        versionLabelOnScreen: text().includes('Version on that machine:'),
        bornLineOnScreen: text().includes('started the program on that machine on this visit'),
        warmLineOnScreen: text().includes('was already running on that machine, so Tortie left it running'),
        pathLineOnScreen: text().includes('read the list of places that machine looks for programs'),
        supportedLabelOnScreen: text().includes('Versions Tortie has measured:'),
        // PHASE 79 deleted the "cannot open a session yet" sentence and moved
        // the no adoption promise from the top of the section onto this row,
        // directly above the Prepare button. This row is where that promise
        // now has to be, so the probe reads it here.
        noAdoptionLineOnScreen: text().includes(${JSON.stringify(HONESTY_ONE)}),
        retiredNoSessionsOnScreen: text().includes(${JSON.stringify(RETIRED_NO_SESSIONS)}),
        anyDash: text().includes('\\u2014') || text().includes('\\u2013')
      };
    `)
  });
  sayWhyNoAnswer(11, res);
  const d = res.parsed;
  const ok =
    d !== null &&
    d.wasEnabled === true &&
    d.drewBlock === true &&
    d.drawnClass === 'prepared' &&
    d.drawnAlarm === 'no' &&
    typeof d.version === 'string' &&
    d.version.length > 0 &&
    d.optionRows >= 12 &&
    d.versionLabelOnScreen === true &&
    d.settingsLabelOnScreen === true &&
    d.pathLineOnScreen === true &&
    // EXACTLY ONE of the two honesty lines, never both and never neither. Which
    // one it is depends on the machine rather than on Tortie, and on this probe
    // it is the warm one for a reason worth writing down: the far side of this
    // connection is this same Mac, on the same socket the app under test boots
    // its own server on, so the server is already there before Prepare runs.
    // The BIRTH is measured elsewhere, by `GMUX_SMOKE=exec-plane` step 3 and by
    // `build/probe-execplane.mjs` steps 7 to 9, both of which end the scratch
    // server first and watch it come back.
    d.bornLineOnScreen !== d.warmLineOnScreen &&
    // The detail sentence and the honesty line beside it must say the same
    // thing. They did not in the first build, and the photograph is what showed
    // it: "Tortie started the program" sat directly above "The program was
    // already running on that machine".
    d.bornLineOnScreen === d.detail.includes('Tortie started the program') &&
    // PHASE 79. The promise that Tortie creates what it runs and adopts
    // nothing lives on this row now, and the sentence Phase 70 made false is
    // gone from the product.
    d.noAdoptionLineOnScreen === true &&
    d.retiredNoSessionsOnScreen === false &&
    d.anyDash === false;
  note(
    11,
    'a prepared machine row, photographed after the button was pressed',
    ok ? 'pass' : 'FAIL',
    `${born}. the trail was ${JSON.stringify(d?.trail ?? null)}. ` +
      `the button read ${JSON.stringify(d?.buttonLabel ?? null)} and was enabled ` +
      `${String(d?.wasEnabled)}. The row drew class ` +
      `${JSON.stringify(d?.drawnClass ?? null)}, alarm ` +
      `${JSON.stringify(d?.drawnAlarm ?? null)}, headline ` +
      `${JSON.stringify(d?.headline ?? null)}, version ` +
      `${JSON.stringify(d?.version ?? null)}, ${String(d?.optionRows)} setting ` +
      `rows. On screen: the version label ${String(d?.versionLabelOnScreen)}, the ` +
      `settings label ${String(d?.settingsLabelOnScreen)}, the program list line ` +
      `${String(d?.pathLineOnScreen)}. Of the two honesty lines it drew the ` +
      `server born line ${String(d?.bornLineOnScreen)} and the server warm line ` +
      `${String(d?.warmLineOnScreen)}, and exactly one of them must be true. On ` +
      `this probe it is the warm one, because the far side is this same Mac on ` +
      `the socket the app under test already booted its own server on. The ` +
      `no adoption promise is on this row ${String(d?.noAdoptionLineOnScreen)} ` +
      `and the retired "cannot open a session yet" sentence is on screen ` +
      `${String(d?.retiredNoSessionsOnScreen)}. A long dash anywhere on the page: ` +
      `${String(d?.anyDash)}. Screenshot ${shot}`
  );
  return ok;
}

/**
 * Step 12. A machine refused for a version nobody measured, photographed.
 *
 * The row is added and confirmed through the same controls as step 4, with the
 * program path in Advanced pointing at a program that reports a made up version.
 * Prepare is pressed, and the refusal must name the version it found, the list
 * Tortie has measured, and what to do next.
 */
async function step12PrepareRefusedPhoto(env, stubPath) {
  const shot = join(outDir, 'p69-version-refused.png');
  const res = await driveSettings({
    shot,
    env,
    timeoutMs: 120_000,
    js: driver(`
      const trail = [];
      trail.push('opening');
      await openMachines();
      const drove = await runTestByButton(
        '127.0.0.1',
        ${sshdPort || 22},
        'Made up version box',
        ${JSON.stringify(stubPath)}
      );
      trail.push('tested:' + String(drove && drove.outcomeClass));
      const added = await act('add-confirm');
      await wait(1200);
      trail.push('added:' + String(added));
      const rows = await m().rows();
      const row = rows.rows.find((r) => r.remoteTmuxPath === ${JSON.stringify(stubPath)}) || null;
      trail.push('row:' + String(row && row.id));
      // Prepare is inside the row's detail section, so press Show first.
      const toggle = row === null
        ? null
        : document.querySelector('[data-machine-id="' + row.id + '"] [data-machines-action="toggle-lines"]');
      if (toggle !== null) { toggle.click(); await wait(400); }
      trail.push('expanded:' + String(toggle !== null));
      const button = row === null
        ? null
        : document.querySelector('[data-machine-id="' + row.id + '"] [data-machines-action="prepare"]');
      trail.push('button:' + String(button !== null) + ':enabled:' + String(button !== null && button.disabled === false));
      if (button !== null && button.disabled === false) button.click();
      const block = await until('.mach-prepare-result[data-prepare-class="version-unmeasured"]', 60000);
      trail.push('block:' + String(block !== null));
      await wait(600);
      const read = (sel) => {
        const el = document.querySelector(sel);
        return el === null ? null : (el.textContent || '').trim();
      };
      const scope = row === null ? document : document.querySelector('[data-machine-id="' + row.id + '"]');
      if (scope !== null) scope.scrollIntoView({ block: 'center' });
      await wait(300);
      return {
        trail,
        added,
        outcomeClass: drove.outcomeClass,
        rowId: row === null ? null : row.id,
        drewBlock: block !== null,
        drawnClass: block === null ? null : block.getAttribute('data-prepare-class'),
        drawnAlarm: block === null ? null : block.getAttribute('data-prepare-alarm'),
        headline: read('.mach-prepare-result[data-prepare-class="version-unmeasured"] .mach-prepare-headline'),
        detail: read('.mach-prepare-result[data-prepare-class="version-unmeasured"] .mach-prepare-detail'),
        foundVersion: read('.mach-prepare-result[data-prepare-class="version-unmeasured"] [data-prepare-version]'),
        supportedOnScreen: read('.mach-prepare-result[data-prepare-class="version-unmeasured"] [data-prepare-supported]'),
        remedyOnScreen: text().includes('then prepare it again'),
        nothingChangedOnScreen: text().includes('Nothing was changed on either machine.'),
        optionRows: document.querySelectorAll('.mach-prepare-result[data-prepare-class="version-unmeasured"] [data-prepare-option]').length,
        anyDash: text().includes('\\u2014') || text().includes('\\u2013')
      };
    `)
  });
  sayWhyNoAnswer(12, res);
  const d = res.parsed;
  const ok =
    d !== null &&
    d.drewBlock === true &&
    d.drawnClass === 'version-unmeasured' &&
    d.drawnAlarm === 'no' &&
    typeof d.foundVersion === 'string' &&
    d.foundVersion.includes('p69-made-up') &&
    typeof d.supportedOnScreen === 'string' &&
    d.supportedOnScreen.length > 0 &&
    d.nothingChangedOnScreen === true &&
    d.optionRows === 0 &&
    d.anyDash === false;
  note(
    12,
    'a machine refused for a version nobody measured, photographed',
    ok ? 'pass' : 'FAIL',
    `the trail was ${JSON.stringify(d?.trail ?? null)}. ` +
      `the row was added ${String(d?.added)} after a test that ended ` +
      `${JSON.stringify(d?.outcomeClass ?? null)}. The row drew class ` +
      `${JSON.stringify(d?.drawnClass ?? null)}, alarm ` +
      `${JSON.stringify(d?.drawnAlarm ?? null)}, headline ` +
      `${JSON.stringify(d?.headline ?? null)}. It names the version it found as ` +
      `${JSON.stringify(d?.foundVersion ?? null)} and the versions Tortie has ` +
      `measured as ${JSON.stringify(d?.supportedOnScreen ?? null)}. The remedy ` +
      `sentence is on screen ${String(d?.remedyOnScreen)}, the "nothing was ` +
      `changed" sentence ${String(d?.nothingChangedOnScreen)}, and it drew ` +
      `${String(d?.optionRows)} setting rows, which must be zero because nothing ` +
      `was started. A long dash anywhere on the page: ${String(d?.anyDash)}. ` +
      `Screenshot ${shot}`
  );
  return ok;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/**
 * Step 10. Nothing this run did added a line to the operator's own record of
 * machine identities.
 *
 * WHY THIS STEP EXISTS. The first build of this phase named no record file, so
 * the client used its own default, which is the file in the person's home
 * folder. Answering the host key question in Tortie added three lines to it.
 * Measured at 932 bytes before a probe run and 1229 bytes after. The build now
 * names a file of its own and puts it first, and this step is how that stays
 * true. It reads the file's size and nothing else. It never opens it.
 */
function step10OperatorRecordUntouched(before, after) {
  const ok = before === after;
  const tortieRecord = join(profile, 'gmux', 'machines', 'known-machines');
  let ownBytes = null;
  try {
    ownBytes = statSync(tortieRecord).size;
  } catch {
    ownBytes = null;
  }
  note(
    10,
    'the record in the operator’s home folder is not written to',
    ok ? 'pass' : 'FAIL',
    `measured by size, read only, never opened. ${userKnownHosts} was ` +
      `${String(before)} bytes before this run and ${String(after)} bytes after. ` +
      `Tortie's own record, inside the throwaway profile, is ` +
      `${ownBytes === null ? 'not there' : `${String(ownBytes)} bytes`} at ` +
      `${tortieRecord}.`
  );
  return ok;
}

async function main() {
  console.log('[p68] the operator tmux server is read only for this probe:');
  try {
    const before = run('/bin/sh', ['-c', 'tmux -L gmux list-sessions 2>/dev/null | wc -l']).trim();
    console.log(`[p68] operator sessions before: ${before}`);
  } catch {
    console.log('[p68] operator sessions before: could not read, treating as 0');
  }

  const knownHostsBefore = userKnownHostsBytes();
  console.log(
    `[p68] ${userKnownHosts} is ${String(knownHostsBefore)} bytes before this run`
  );

  // One run at a time, because two runs share one scratch profile and would
  // read each other's machines. MEASURED: two overlapping runs produced a
  // profile holding a machine from the older run's port, so the newer run's add
  // took the id `scratch-box-2` and its step 4 failed on a file it had not
  // written. The lock is checked before the scratch directory is removed,
  // because removing it is the first thing that would destroy the other run.
  const lock = join(scratch, 'p68-run.lock');
  if (existsSync(lock)) {
    const other = Number(readFileSync(lock, 'utf8').trim());
    if (Number.isInteger(other) && other > 0 && isAlive(other)) {
      console.error(
        `[p68] refusing to run: process ${String(other)} is already running ` +
          `this probe against ${scratch}. Wait for it, or end it, and try again.`
      );
      process.exit(2);
    }
  }

  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(lock, `${String(process.pid)}\n`, 'utf8');

  try {
    remoteProgram = run('/bin/sh', ['-c', 'command -v tmux']).trim();
  } catch {
    remoteProgram = '';
  }
  console.log(
    `[p68] the program path typed into Advanced is ` +
      `${remoteProgram === '' ? 'empty, because this Mac has none' : remoteProgram}`
  );

  const port = await startScratchSshd();
  const standIn = writeSshStandIn();
  let env = {};
  if (port > 0) {
    carriage = `a real /usr/sbin/sshd on 127.0.0.1:${String(port)}`;
  } else {
    carriage = 'a scripted stand in for ssh, because a non root sshd could not start';
    env = { GMUX_SSH_BIN: standIn };
    sshdPort = 22;
  }
  console.log(`[p68] carriage: ${carriage}`);

  await step1Empty();
  await step2AddMachine();
  await step3Test(env);
  await step4Confirm(env);
  // Phase 69's two photographs run here, while exactly one confirmed machine is
  // on the list and its identity is recorded from the one visible test. Step 8
  // later plants a key that is not the machine's, so they cannot run after it.
  await step11PreparePhoto(env);
  await step12PrepareRefusedPhoto(env, writeMadeUpVersionProgram());
  await step5WatcherChange();
  await step6LabelOnly();
  await step7Refused();
  await step8HostKeyChanged(standIn);
  await step9QuitWithTestRunning(standIn);
  step10OperatorRecordUntouched(knownHostsBefore, userKnownHostsBytes());

  // Teardown. Only recorded pids.
  for (const pid of recordedPids) {
    if (isAlive(pid)) killRecorded(pid);
  }
  await sleep(500);
  rmSync(scratch, { recursive: true, force: true });

  try {
    const after = run('/bin/sh', ['-c', 'tmux -L gmux list-sessions 2>/dev/null | wc -l']).trim();
    console.log(`[p68] operator sessions after: ${after}`);
  } catch {
    console.log('[p68] operator sessions after: could not read, treating as 0');
  }

  const pad = (v, w) => String(v).padEnd(w);
  console.log('\nstep  verdict  what');
  console.log('-'.repeat(100));
  for (const row of steps.sort((a, b) => a.step - b.step)) {
    console.log(`${pad(row.step, 5)} ${pad(row.verdict, 8)} ${row.what}`);
  }
  console.log(`\ncarriage: ${carriage}`);
  console.log(
    'NOT PROVEN BY THIS RUN: no machine of the operator is contacted, no remote tmux is ' +
      'started, no tmux version is measured, and the failure taxonomy is pinned by ' +
      'fixtures rather than by golden files per tested remote version.'
  );

  const failed = steps.filter((row) => row.verdict === 'FAIL');
  if (failed.length > 0) {
    console.error(`\n${String(failed.length)} step(s) failed.`);
    process.exit(1);
  }
  console.log('\nPASS.');
}


main().catch((err) => {
  console.error(`[p68] the probe itself failed: ${err.message}`);
  for (const pid of recordedPids) {
    if (isAlive(pid)) killRecorded(pid);
  }
  process.exit(1);
});
