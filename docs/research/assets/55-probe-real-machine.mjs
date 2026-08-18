/**
 * Research 55's own probe. It measures what a folder listing, a git read and a
 * file read cost on a REAL second machine, over the operator's tailnet, using
 * the same ssh options `src/main/machines/ssh.ts` composes.
 *
 * IT IS READ ONLY ON BOTH MACHINES. It starts no tmux server, touches no
 * manifest, writes no file on the far side and runs no mutating program there.
 * Every far side command is `find`, `git rev-parse`, `git status`, `head`,
 * `wc` or `true`.
 *
 * Usage: node docs/research/assets/55-probe-real-machine.mjs <host> <scratchdir>
 */
import { execFile, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const host = process.argv[2];
const scratch = process.argv[3];
mkdirSync(scratch, { recursive: true });
const control = join(scratch, 'r55.sock');
const known = join(scratch, 'known_hosts');

// The steady state options, in the order src/main/machines/ssh.ts writes them.
const OPTS = [
  '-o', 'BatchMode=yes',
  '-o', 'ConnectTimeout=10',
  '-o', 'StrictHostKeyChecking=accept-new',
  '-o', `UserKnownHostsFile=${known}`,
  '-o', 'ControlMaster=auto',
  '-o', `ControlPath=${control}`,
  '-o', 'ControlPersist=60s',
  '-o', 'ServerAliveInterval=15',
  '-o', 'ServerAliveCountMax=3'
];
const COLD = [
  '-o', 'BatchMode=yes',
  '-o', 'ConnectTimeout=10',
  '-o', 'StrictHostKeyChecking=accept-new',
  '-o', `UserKnownHostsFile=${known}`,
  '-o', 'ControlMaster=no',
  '-o', 'ControlPath=none'
];

const now = () => Number(process.hrtime.bigint()) / 1e6;
function stats(xs) {
  const a = [...xs].sort((p, q) => p - q);
  const at = (f) => a[Math.min(a.length - 1, Math.floor(a.length * f))];
  return { n: a.length, min: a[0], p50: at(0.5), p90: at(0.9), max: a[a.length - 1] };
}
async function run(opts, command) {
  const t = now();
  const { stdout } = await execFileP('/usr/bin/ssh', [...opts, host, command], {
    maxBuffer: 64 * 1024 * 1024
  });
  return { ms: now() - t, bytes: Buffer.byteLength(stdout), stdout };
}
async function series(label, opts, command, times) {
  const out = [];
  let bytes = 0;
  for (let i = 0; i < times; i += 1) {
    const r = await run(opts, command);
    out.push(r.ms);
    bytes = r.bytes;
  }
  return { label, bytes, ...stats(out) };
}

const rows = [];
const note = (o) => { rows.push(o); console.log(JSON.stringify(o)); };

// Warm the master.
await run(OPTS, 'true');

note(await series('cold connection, true', COLD, 'true', 10));
note(await series('warm multiplexed, true', OPTS, 'true', 20));

// The door's own shape: one quoted /bin/sh -c argument.
const shq = (s) => `'${s.replaceAll("'", `'\\''`)}'`;
const REVIEW_LIST = [
  'set -e', 'umask 077', 'cd "$1"',
  'r=$(git rev-parse --show-toplevel 2>/dev/null || true)',
  "e=$(printf '%s' \"$r\" | base64 | tr -d '\\n')",
  'if [ -n "$r" ]; then',
  "  s=$(git --no-pager status --porcelain=v2 --branch -z --untracked-files=all | base64 | tr -d '\\n')",
  'else', '  s=', 'fi',
  "printf '__TORTIE_RUN__%s %s__TORTIE_RUN__\\n' \"${e:-none}\" \"${s:-none}\""
].join('\n');

// A directory listing shaped as a candidate eighth script: one root, one depth.
// `.git` is pruned the way the local tree prunes it. Three shapes are timed so
// the cost of the per entry facts a tree row needs is separated from the cost
// of the walk itself.
const FIND = 'find "$1" -mindepth 1 -maxdepth "$2" -name .git -prune -o';

const DIR_LIST_PATHS = [
  'set -e', 'umask 077',
  'if [ -d "$1" ]; then',
  '  o=$(' + FIND + ' -print 2>/dev/null | head -n "$3")',
  'else', '  o=', 'fi',
  "printf '__TORTIE_RUN__%s__TORTIE_RUN__\\n' \"${o:-none}\""
].join('\n');

const DIR_LIST_BATCHSTAT = [
  'set -e', 'umask 077',
  'if [ -d "$1" ]; then',
  '  o=$(' + FIND + ' -exec stat -f \'%HT %m %z %N\' {} + 2>/dev/null | head -n "$3")',
  'else', '  o=', 'fi',
  "printf '__TORTIE_RUN__%s__TORTIE_RUN__\\n' \"${o:-none}\""
].join('\n');

async function script(label, text, name, args, times) {
  const command = ['/bin/sh', '-c', text, name, ...args].map(shq).join(' ');
  const out = [];
  let bytes = 0;
  for (let i = 0; i < times; i += 1) {
    const r = await run(OPTS, command);
    out.push(r.ms);
    bytes = r.bytes;
  }
  return { label, commandBytes: Buffer.byteLength(command), bytes, ...stats(out) };
}

const target = process.argv[4] ?? '/usr/share';
const repo = process.argv[5] ?? '/tmp';
const bigRepo = process.argv[6] ?? repo;
note(await script('review-list, small repo', REVIEW_LIST, 'tortie-review-list', [repo], 7));
note(await script('review-list, big repo', REVIEW_LIST, 'tortie-review-list', [bigRepo], 7));
for (const depth of ['1', '2', '3']) {
  note(await script(`dir-list stat, ${target} depth ${depth}`, DIR_LIST_BATCHSTAT, 'tortie-dir-list', [target, depth, '20000'], 7));
  note(await script(`dir-list paths, ${target} depth ${depth}`, DIR_LIST_PATHS, 'tortie-dir-list', [target, depth, '20000'], 7));
}
note(await script('dir-list batch stat, /usr/bin depth 1', DIR_LIST_BATCHSTAT, 'tortie-dir-list', ['/usr/bin', '1', '20000'], 7));
note(await script('dir-list batch stat, home depth 1', DIR_LIST_BATCHSTAT, 'tortie-dir-list', [process.argv[7] ?? '/Users', '1', '20000'], 7));

// Fan out: N calls at once through one master.
for (const n of [1, 4, 8, 12, 16, 24, 32, 50]) {
  const t = now();
  const results = await Promise.allSettled(
    Array.from({ length: n }, () => run(OPTS, 'true'))
  );
  const failed = results.filter((r) => r.status === 'rejected').length;
  note({ label: `fan out ${String(n)}`, wallMs: now() - t, failed });
}

writeFileSync(join(scratch, 'r55-results.json'), JSON.stringify(rows, null, 2));
console.log('done');
