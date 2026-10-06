#!/usr/bin/env node
/**
 * build/p340/tailscale-peers.mjs. A program that answers ONE Tailscale command,
 * `status --json`, with a fixture, for `probe:p340` (build/p340/SPEC.md §9.4).
 * IT IS NOT TAILSCALE, and it reaches no network.
 *
 * WHY. Phase 340's Add a machine looks at the tailnet the moment it is
 * pressed (D6), through the program `resolveTailscale` names, which in a
 * development build is `GMUX_TAILSCALE_BIN` when that names an absolute
 * executable file. No agent may ask his real Tailscale for his real machines,
 * so the probe names a scratch wrapper that runs this file instead, and its
 * preflight checks the wrapper, this file and the fixture by sha256 before
 * every launch.
 *
 * ITS SURFACE:
 *
 *   status --json      prints the fixture file, exactly, and exits 0.
 *
 * EVERY OTHER ARGV exits 2 and appends one line to its log, `REFUSED <argv as
 * JSON>`, so the probe can count what the app asked for and fail on anything
 * but the one read. An answered read appends `ANSWERED status --json`.
 *
 * HOW IT IS CALLED. `node tailscale-peers.mjs <fixture> <log> <tailscale
 * argv…>`: the probe's wrapper names the fixture and the log, so this file
 * reads no environment variable and needs none.
 *
 * THE FIXTURE (build/p340/fixtures/tailnet.json) is `ipnstate.Status` as
 * `tailscale status --json` prints it, cut to the fields
 * src/main/machines/tailscale.ts reads: this Mac as `Self`; `p340-loop` at
 * `127.0.0.1.` (the loopback machine, reached through the probe's ssh wrapper,
 * which puts the yard's port first, M15); `p340-loop2` at `localhost.`, the
 * same machine under another name (arm A15, two picks in a row); an offline
 * Linux peer; an iPhone; and one Funnel relay, which Phase 339 leaves out.
 *
 *   node build/p340/tailscale-peers.mjs --self-test   proves the surface, starts nothing
 */

import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(import.meta.url);

/** True when `argv` is exactly the one read this stand-in answers. */
export function isStatusRead(argv) {
  return Array.isArray(argv) && argv.length === 2 && argv[0] === 'status' && argv[1] === '--json';
}

/** The log line for one call. */
export function logLineFor(argv) {
  return isStatusRead(argv) ? 'ANSWERED status --json' : `REFUSED ${JSON.stringify(argv)}`;
}

/** Count the log's lines by kind: `{ answered, refused }`. */
export function readLog(text) {
  const lines = String(text ?? '').split('\n').filter((l) => l !== '');
  return {
    answered: lines.filter((l) => l === 'ANSWERED status --json').length,
    refused: lines.filter((l) => l.startsWith('REFUSED ')).length,
    other: lines.filter((l) => l !== 'ANSWERED status --json' && !l.startsWith('REFUSED ')).length
  };
}

function selfTest() {
  const fixture = JSON.parse(readFileSync(join(dirname(HERE), 'fixtures', 'tailnet.json'), 'utf8'));
  const peers = Object.values(fixture.Peer ?? {});
  const cases = [
    ['status --json is the one read', isStatusRead(['status', '--json']), true],
    ['status alone is refused', isStatusRead(['status']), false],
    ['status --json --peers=false is refused', isStatusRead(['status', '--json', '--peers=false']), false],
    ['funnel is refused', isStatusRead(['funnel', '--tcp=8443']), false],
    ['the log names an answered read', logLineFor(['status', '--json']), 'ANSWERED status --json'],
    ['the log names a refused one', logLineFor(['up']), 'REFUSED ["up"]'],
    ['the log reader counts', JSON.stringify(readLog('ANSWERED status --json\nREFUSED ["up"]\n')), JSON.stringify({ answered: 1, refused: 1, other: 0 })],
    ['the fixture has this Mac as Self', fixture.Self?.HostName, 'p340-this-mac'],
    ['p340-loop is at 127.0.0.1.', peers.find((p) => p.HostName === 'p340-loop')?.DNSName, '127.0.0.1.'],
    ['p340-loop2 is at localhost.', peers.find((p) => p.HostName === 'p340-loop2')?.DNSName, 'localhost.'],
    ['one Funnel relay', peers.filter((p) => p.ShareeNode === true && (p.Tags ?? []).includes('tag:ingress')).length, 1],
    ['five peers', peers.length, 5]
  ];
  let ok = true;
  for (const [label, got, want] of cases) {
    const good = JSON.stringify(got) === JSON.stringify(want);
    ok = ok && good;
    process.stdout.write(`[p340-tailscale] ${good ? 'ok  ' : 'BAD '} ${label}: ${JSON.stringify(got)}\n`);
  }
  process.stdout.write(`[p340-tailscale] self-test ${ok ? 'PASS' : 'FAIL'}\n`);
  return ok;
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === HERE;
if (isMain) {
  if (process.argv[2] === '--self-test') process.exit(selfTest() ? 0 : 1);
  const [fixture, log, ...argv] = process.argv.slice(2);
  if (typeof fixture !== 'string' || typeof log !== 'string' || !fixture.startsWith('/') || !log.startsWith('/')) {
    process.stderr.write('tailscale-peers: the wrapper must name an absolute fixture and log.\n');
    process.exit(2);
  }
  appendFileSync(log, `${logLineFor(argv)}\n`);
  if (!isStatusRead(argv)) {
    process.stderr.write(`tailscale-peers: refused ${JSON.stringify(argv)}; this stand-in answers status --json alone.\n`);
    process.exit(2);
  }
  process.stdout.write(readFileSync(fixture, 'utf8'));
  process.exit(0);
}
