/**
 * Research 55, second pass: what batching buys, on a real second machine.
 *
 * READ ONLY on both machines. Every far side command is `find`, `stat`, `git
 * show`, `head` or `true`. It starts no tmux server and writes no file there.
 *
 * Usage: node 55-probe-batching.mjs <host> <controldir> <root>
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);
const [host, dir, root] = process.argv.slice(2);
const control = `${dir}/b55.sock`;
const known = `${dir}/known_hosts`;
const OPTS = [
  '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
  '-o', 'StrictHostKeyChecking=accept-new', '-o', `UserKnownHostsFile=${known}`,
  '-o', 'ControlMaster=auto', '-o', `ControlPath=${control}`,
  '-o', 'ControlPersist=60s', '-o', 'ServerAliveInterval=15',
  '-o', 'ServerAliveCountMax=3'
];
const now = () => Number(process.hrtime.bigint()) / 1e6;
const shq = (s) => `'${s.replaceAll("'", `'\\''`)}'`;
const stats = (xs) => {
  const a = [...xs].sort((p, q) => p - q);
  const at = (f) => a[Math.min(a.length - 1, Math.floor(a.length * f))];
  return { n: a.length, min: +a[0].toFixed(1), p50: +at(0.5).toFixed(1), p90: +at(0.9).toFixed(1), max: +a[a.length - 1].toFixed(1) };
};
async function ssh(command) {
  const t = now();
  const { stdout } = await execFileP('/usr/bin/ssh', [...OPTS, host, command], { maxBuffer: 64 * 1024 * 1024 });
  return { ms: now() - t, bytes: Buffer.byteLength(stdout) };
}
const ONE = [
  'set -e', 'umask 077',
  'if [ -d "$1" ]; then',
  '  o=$(find "$1" -mindepth 1 -maxdepth 1 -name .git -prune -o -exec stat -f \'%HT %m %z %N\' {} + 2>/dev/null)',
  'else', '  o=', 'fi',
  "printf '__TORTIE_RUN__%s__TORTIE_RUN__\\n' \"${o:-none}\""
].join('\n');
// Nine roots, the most `$1` to `$9` allows without changing the gate.
const NINE = [
  'set -e', 'umask 077',
  'for d in "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8" "$9"; do',
  '  [ -d "$d" ] || continue',
  '  find "$d" -mindepth 1 -maxdepth 1 -name .git -prune -o -exec stat -f \'%HT %m %z %N\' {} + 2>/dev/null || true',
  'done'
].join('\n');
const DEPTH = [
  'set -e', 'umask 077',
  'o=$(find "$1" -mindepth 1 -maxdepth "$2" -name .git -prune -o -exec stat -f \'%HT %m %z %N\' {} + 2>/dev/null | head -n "$3")',
  "printf '__TORTIE_RUN__%s__TORTIE_RUN__\\n' \"${o:-none}\""
].join('\n');
const cmd = (text, name, args) => ['/bin/sh', '-c', text, name, ...args].map(shq).join(' ');

await ssh('true');
// The nine child directories of the root, so the two shapes cover the same ground.
const { stdout: kids } = await execFileP('/usr/bin/ssh', [...OPTS, host,
  cmd(['set -e','umask 077','find "$1" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | head -n 9'].join('\n'), 'tortie-kids', [root])], { maxBuffer: 1 << 20 });
const dirs = kids.trim().split('\n').filter((x) => x.length > 0);
console.log(JSON.stringify({ label: 'child directories used', dirs }));

const serial = [];
let serialBytes = 0;
for (let round = 0; round < 5; round += 1) {
  const t = now();
  let bytes = 0;
  for (const d of dirs) bytes += (await ssh(cmd(ONE, 'tortie-dir-list', [d]))).bytes;
  serial.push(now() - t);
  serialBytes = bytes;
}
console.log(JSON.stringify({ label: `${String(dirs.length)} folders, one call each`, bytes: serialBytes, ...stats(serial) }));

const batched = [];
let batchedBytes = 0;
const nineArgs = [...dirs, ...Array.from({ length: 9 - dirs.length }, () => '/nonexistent')].slice(0, 9);
const nineCmd = cmd(NINE, 'tortie-dir-list-9', nineArgs);
for (let round = 0; round < 5; round += 1) {
  const t = now();
  const r = await ssh(nineCmd);
  batched.push(now() - t);
  batchedBytes = r.bytes;
}
console.log(JSON.stringify({ label: `${String(dirs.length)} folders, ONE call, nine parameters`, commandBytes: Buffer.byteLength(nineCmd), bytes: batchedBytes, ...stats(batched) }));

const parallel = [];
for (let round = 0; round < 5; round += 1) {
  const t = now();
  await Promise.all(dirs.map((d) => ssh(cmd(ONE, 'tortie-dir-list', [d]))));
  parallel.push(now() - t);
}
console.log(JSON.stringify({ label: `${String(dirs.length)} folders, all at once`, ...stats(parallel) }));

for (const depth of ['1', '2', '3']) {
  const c = cmd(DEPTH, 'tortie-dir-depth', [root, depth, '20000']);
  const xs = [];
  let bytes = 0;
  for (let i = 0; i < 5; i += 1) { const r = await ssh(c); xs.push(r.ms); bytes = r.bytes; }
  console.log(JSON.stringify({ label: `one call, ${root} to depth ${depth}`, bytes, ...stats(xs) }));
}
