/**
 * `npm run goldens:machines`. Capture what the sign in program and the far side's
 * tmux ACTUALLY print, one file per failure class (Phase 69, M2, research 51
 * section 7).
 *
 * ## Why golden files rather than fixtures written by hand
 *
 * `src/main/machines/errors.ts` decides which class a machine's answer is by
 * matching phrases. Until this rung those phrases were pinned by unit tests
 * carrying text somebody typed, which proves the matcher matches what the author
 * believed the program prints. An ssh upgrade that reworded one line would pass
 * every test and silently reclassify a real failure. These files are the bytes a
 * real program printed on a real run, and `golden.test.ts` reads them without
 * running anything, so the check is cheap and the capture is honest.
 *
 * ## What has no golden, and why that is the honest answer
 *
 * Four classes are Tortie's own words. `timed-out`, `cancelled`,
 * `client-missing` and `unknown` are produced by Tortie when a deadline passed,
 * when a person pressed Cancel, when this Mac has no client, and when nothing
 * matched. No program prints them, so a file for one would look like a
 * measurement while being a fixture. `version-unmeasured` and `prepared` are
 * Tortie's own judgement for the same reason. The manifest records every one of
 * them with that reason beside it.
 *
 * ## Safety
 *
 * It starts its own sshd on 127.0.0.1 on a high port, with keys it generates in
 * its own scratch directory. It refuses to run when the tmux socket it would use
 * is the real one. It kills only pids it recorded, and it prints that list. It
 * never reads or writes the operator's own identity record file, and it measures
 * that file in bytes before and after to prove it.
 *
 * Usage:
 *   node build/capture-machine-goldens.mjs            capture, write the files
 *   node build/capture-machine-goldens.mjs --dry-run  print what it would do
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
const goldenDir = join(
  repoRoot,
  'src',
  'main',
  'machines',
  '__tests__',
  'golden'
);
const dryRun = process.argv.includes('--dry-run');

/** The scratch root. Every file this script writes carries the p69- prefix. */
const root = join(tmpdir(), `p69-goldens-${String(process.pid)}`);

/** The socket the far side's tmux is addressed on. NEVER the real one. */
const SOCKET = `gmux-p69-golden-${String(process.pid)}`;

if (SOCKET === 'gmux') {
  console.error('[goldens] the socket would be the real one. Refusing to run.');
  process.exit(1);
}

const recordedPids = [];
const lines = [];
const say = (text) => {
  lines.push(text);
  console.log(`[goldens] ${text}`);
};

function sh(file, args, options = {}) {
  try {
    return {
      code: 0,
      out: execFileSync(file, args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        ...options
      })
    };
  } catch (err) {
    return {
      code: typeof err.status === 'number' ? err.status : -1,
      out: `${err.stdout ?? ''}${err.stderr ?? ''}`
    };
  }
}

/** The person's own record file, read for its size and never written. */
const userRecord = join(homedir(), '.ssh', 'known_hosts');
const sizeOf = (path) => {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
};
const userRecordBefore = sizeOf(userRecord);

if (dryRun) {
  say('dry run. Nothing is started and nothing is written.');
  say(`it would write to ${goldenDir}`);
  say(`it would run an sshd on 127.0.0.1 with keys under ${root}`);
  process.exit(0);
}

mkdirSync(root, { recursive: true, mode: 0o700 });
mkdirSync(goldenDir, { recursive: true });

// ---------------------------------------------------------------------------
// The carriage: one sshd, one key, one agent, all this script's own
// ---------------------------------------------------------------------------

const sshBin = '/usr/bin/ssh';
const keygen = '/usr/bin/ssh-keygen';
const sshdBin = '/usr/sbin/sshd';

const hostKey = join(root, 'p69-hostkey');
const userKey = join(root, 'p69-userkey');
const authorized = join(root, 'p69-authorized');
const tortieRecord = join(root, 'p69-known-machines');
const sshdConf = join(root, 'p69-sshd.conf');
const port = 34_000 + (process.pid % 2000);

sh(keygen, ['-q', '-t', 'ed25519', '-N', '', '-f', hostKey]);
sh(keygen, ['-q', '-t', 'ed25519', '-N', '', '-f', userKey]);
writeFileSync(authorized, readFileSync(`${userKey}.pub`, 'utf8'), 'utf8');
chmodSync(authorized, 0o600);
writeFileSync(tortieRecord, '', 'utf8');

writeFileSync(
  sshdConf,
  [
    `Port ${String(port)}`,
    'ListenAddress 127.0.0.1',
    `HostKey ${hostKey}`,
    `AuthorizedKeysFile ${authorized}`,
    'PasswordAuthentication no',
    'KbdInteractiveAuthentication no',
    'ChallengeResponseAuthentication no',
    'UsePAM no',
    'StrictModes no',
    'PermitUserEnvironment no',
    'LogLevel QUIET',
    ''
  ].join('\n'),
  'utf8'
);

const sshd = spawn(sshdBin, ['-D', '-f', sshdConf], {
  stdio: 'ignore',
  detached: false
});
recordedPids.push(sshd.pid);
say(`sshd pid ${String(sshd.pid)} on 127.0.0.1:${String(port)}`);

/** Give the far side a moment to bind, then prove it answers. */
function waitForSshd() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const probe = sh('/usr/bin/nc', ['-z', '127.0.0.1', String(port)]);
    if (probe.code === 0) return true;
    execFileSync('/bin/sleep', ['0.1']);
  }
  return false;
}

const carriageUp = waitForSshd();
if (!carriageUp) {
  say('the sshd did not answer, so nothing captured here is evidence about ssh');
}

const me = execFileSync('/usr/bin/id', ['-un'], { encoding: 'utf8' }).trim();
const tmuxPath = sh('/usr/bin/which', ['tmux']).out.trim() || '/usr/bin/tmux';

/** The steady state options, mirrored from src/main/machines/ssh.ts. */
function steadyOptions(overrides = {}) {
  const known = overrides.knownHosts ?? `"${tortieRecord}" "${userRecord}"`;
  return [
    '-o',
    'BatchMode=yes',
    '-o',
    `ConnectTimeout=${String(overrides.connectTimeout ?? 10)}`,
    '-o',
    `StrictHostKeyChecking=${overrides.strict ?? 'no'}`,
    '-o',
    `UserKnownHostsFile=${known}`,
    '-o',
    'ControlMaster=no',
    '-o',
    'ServerAliveInterval=5',
    '-o',
    'ServerAliveCountMax=3',
    '-o',
    `IdentityFile=${userKey}`,
    '-o',
    'IdentitiesOnly=yes'
  ];
}

function runSsh(args) {
  return sh(sshBin, args, { timeout: 30_000 });
}

// ---------------------------------------------------------------------------
// The captures
// ---------------------------------------------------------------------------

const captures = [];

/** Record one capture, and write its file. */
function capture(cls, note, result) {
  const text = result.out;
  captures.push({
    class: cls,
    file: `${cls}.txt`,
    note,
    exitCode: result.code,
    bytes: Buffer.byteLength(text, 'utf8')
  });
  writeFileSync(join(goldenDir, `${cls}.txt`), text, 'utf8');
  say(
    `${cls}: exit ${String(result.code)}, ${String(
      Buffer.byteLength(text, 'utf8')
    )} bytes, first line ${JSON.stringify(firstLine(text))}`
  );
}

function firstLine(text) {
  return (
    text
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? ''
  );
}

// ok. The machine answers and the program is found.
capture(
  'ok',
  'The scratch sshd answered and the named program was found.',
  runSsh([
    ...steadyOptions(),
    '-p',
    String(port),
    '-l',
    me,
    '127.0.0.1',
    `printf '__TORTIE_PATH__%s__TORTIE_PATH__\\n' "$(command -v ${tmuxPath} || true)"`
  ])
);

// no-server. The machine answers and no server is on the scratch socket.
capture(
  'no-server',
  'The scratch sshd answered and nothing was running on the scratch socket.',
  runSsh([
    ...steadyOptions(),
    '-p',
    String(port),
    '-l',
    me,
    '127.0.0.1',
    tmuxPath,
    '-L',
    SOCKET,
    '-f',
    '/dev/null',
    'list-sessions',
    '-F',
    '#{session_id}'
  ])
);

// no-program. The machine answers and the named program is absent.
capture(
  'no-program',
  'The scratch sshd answered and the named program was not on it.',
  runSsh([
    ...steadyOptions(),
    '-p',
    String(port),
    '-l',
    me,
    '127.0.0.1',
    `printf '__TORTIE_PATH__%s__TORTIE_PATH__\\n' "$(command -v /nonexistent/p69-not-a-program || true)"`
  ])
);

// host-key-changed. A wrong key planted in Tortie's OWN record file.
const wrongRecord = join(root, 'p69-wrong-record');
const wrongKey = join(root, 'p69-wrongkey');
sh(keygen, ['-q', '-t', 'ed25519', '-N', '', '-f', wrongKey]);
writeFileSync(
  wrongRecord,
  `[127.0.0.1]:${String(port)} ${readFileSync(`${wrongKey}.pub`, 'utf8').trim()}\n`,
  'utf8'
);
capture(
  'host-key-changed',
  "A key that is not the machine's, planted in Tortie's own record file.",
  runSsh([
    ...steadyOptions({ knownHosts: `"${wrongRecord}"`, strict: 'yes' }),
    '-p',
    String(port),
    '-l',
    me,
    '127.0.0.1',
    'true'
  ])
);

// auth-refused. Connect with no usable key at all.
capture(
  'auth-refused',
  'Connect with no key the machine will accept.',
  runSsh([
    '-o',
    'BatchMode=yes',
    '-o',
    'ConnectTimeout=10',
    '-o',
    'StrictHostKeyChecking=no',
    '-o',
    `UserKnownHostsFile=${tortieRecord}`,
    '-o',
    `IdentityFile=${wrongKey}`,
    '-o',
    'IdentitiesOnly=yes',
    '-p',
    String(port),
    '-l',
    me,
    '127.0.0.1',
    'true'
  ])
);

// refused. A high port with nothing listening.
capture(
  'refused',
  'A high port on this Mac with nothing listening on it.',
  runSsh([
    ...steadyOptions(),
    '-p',
    String(port + 1),
    '-l',
    me,
    '127.0.0.1',
    'true'
  ])
);

// not-resolved. A name that resolves to nothing.
capture(
  'not-resolved',
  'A name under .invalid, which resolves to nothing by definition.',
  runSsh([
    ...steadyOptions(),
    '-l',
    me,
    'p69-no-such-machine.invalid',
    'true'
  ])
);

// unreachable. TEST-NET-1, which reaches nobody.
capture(
  'unreachable',
  '192.0.2.1, TEST-NET-1, with a short connect timeout. It reaches nobody.',
  runSsh([
    ...steadyOptions({ connectTimeout: 3 }),
    '-l',
    me,
    '192.0.2.1',
    'true'
  ])
);

// ---------------------------------------------------------------------------
// The manifest, including what has no golden and why
// ---------------------------------------------------------------------------

/**
 * The client's own version string.
 *
 * `ssh -V` prints to STDERR and exits 0, which is why this is read with
 * `2>&1` rather than through the helper above. The manifest carrying an empty
 * client string is what the conformance gate fails on, and it failed on exactly
 * this the first time.
 */
const sshVersion = sh('/bin/sh', ['-c', `${sshBin} -V 2>&1`]).out.trim();
const remoteTmuxVersion = sh('/bin/sh', ['-c', `${tmuxPath} -V 2>&1`]).out.trim();

const noGolden = [
  {
    class: 'timed-out',
    reason:
      'Tortie produces this sentence when its own deadline passed. No program ' +
      'prints it, so a file for it would look like a measurement while being a ' +
      'fixture.'
  },
  {
    class: 'cancelled',
    reason:
      'Tortie produces this when a person pressed Cancel. No program prints it.'
  },
  {
    class: 'client-missing',
    reason:
      'Tortie produces this when this Mac has no sign in program at all, so ' +
      'there is no program to capture output from.'
  },
  {
    class: 'unknown',
    reason:
      'This is the class for text no rule matched, so its content is by ' +
      'definition whatever nobody has seen yet. A captured example would make ' +
      'one unknown message look like the definition of the class.'
  },
  {
    class: 'version-unmeasured',
    reason:
      "Tortie's own judgement about a version, not a program's output."
  },
  {
    class: 'prepared',
    reason: "Tortie's own answer on success, not a program's output."
  }
];

const userRecordAfter = sizeOf(userRecord);
const manifest = {
  note:
    'Captured by build/capture-machine-goldens.mjs against a scratch sshd on ' +
    '127.0.0.1. Re-run it after an ssh upgrade or a tmux upgrade. ' +
    'src/main/machines/__tests__/golden.test.ts reads these files and runs ' +
    'nothing at all.',
  capturedAt: new Date().toISOString().slice(0, 10),
  sshClient: sshVersion,
  remoteTmux: remoteTmuxVersion,
  carriageStarted: carriageUp,
  captures,
  noGolden
};
writeFileSync(
  join(goldenDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8'
);

// ---------------------------------------------------------------------------
// Teardown, and the two numbers that prove nothing of the operator's moved
// ---------------------------------------------------------------------------

for (const pid of recordedPids) {
  if (typeof pid !== 'number') continue;
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    /* already gone is the state we wanted */
  }
}
say(`killed only these recorded pids: ${recordedPids.join(', ')}`);

if (existsSync(root)) rmSync(root, { recursive: true, force: true });

say(
  `the person's own record file was ${String(userRecordBefore)} bytes before ` +
    `and ${String(userRecordAfter)} bytes after`
);
if (userRecordBefore !== userRecordAfter) {
  console.error(
    '[goldens] FAIL: the run changed the size of the record file in the home folder.'
  );
  process.exit(1);
}
say(`wrote ${String(captures.length)} golden file(s) and the manifest`);
