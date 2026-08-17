/**
 * Where the Add Machine picker gets its names (Phase 68, research 51 section
 * 4.2, discovery).
 *
 * Tortie asks the Tailscale program on this Mac which machines the person has.
 * It runs the copy at one of three pinned absolute paths, and it shows the path
 * it ran on screen at pick time.
 *
 * ## Why a bare name is never used
 *
 * A bare `tailscale` would be found through PATH, and a planted binary earlier
 * on PATH is exactly the attack the confirm gate exists for. Running a pinned
 * absolute path and printing it means a person can see which file answered.
 *
 * ## Why `~/.ssh/config` is never a source
 *
 * Tortie does not read `~/.ssh/config` here, and does not read it anywhere in
 * this directory. Research 51 records that the operator's own file holds one
 * Host entry and it is an unrelated address, so enumerating it would offer a
 * list that is wrong and would read a file Tortie has no business in. Tortie
 * writes no keys and no known_hosts entries either, on this Mac or on the other
 * machine. `build/conformance-machines.mjs` greps this directory and fails when
 * either of those two things is named by anything that is not a comment
 * refusing to read it.
 *
 * ## What this module does, and when
 *
 * One `execFile`, with no shell, a five second deadline and a four megabyte
 * output cap. It is reachable from one place, being the person pressing `Find
 * machines on your tailnet`. It is not on any boot path, not on any watcher
 * path, and not on any path that opens a session.
 */

import { execFile } from 'node:child_process';
import { accessSync, constants, statSync } from 'node:fs';
import type { TailscalePeerView, TailscaleSourceResult } from '@shared/ipc';

import { getLog } from '../log';

const machinesLog = getLog('config');

/** How long the Tailscale program gets to answer. */
export const TAILSCALE_DEADLINE_MS = 5_000;

/** The most output Tortie will buffer from it. */
export const TAILSCALE_MAX_OUTPUT = 4 * 1024 * 1024;

/**
 * The paths Tortie looks at, in order. The first one that is an executable file
 * wins.
 *
 * The app bundle first, because that is where the Tailscale a person installs
 * from the App Store or from tailscale.com puts its command line copy. Then the
 * two places Homebrew and the standalone installer use.
 */
export const TAILSCALE_CANDIDATES: readonly string[] = [
  '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
  '/usr/local/bin/tailscale',
  '/opt/homebrew/bin/tailscale'
];

/** True when `path` is a file this process may execute. */
function isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Which Tailscale program this run would use, and where the path came from. */
export interface TailscaleResolution {
  path: string | null;
  source: 'pinned' | 'dev-override' | 'missing';
  detail: string;
}

let saidPackagedOverrideIgnored = false;

/**
 * Resolve the Tailscale program.
 *
 * `GMUX_TAILSCALE_BIN` is a development only override, in the shape
 * `resolveTmux` already uses for `GMUX_TMUX_BIN`. A packaged Tortie ignores it
 * with one warning and uses the pinned list, because an environment variable
 * that decides which program answers a question about the user's network is
 * exactly what the pinned list exists to prevent. In a development build the
 * override must name an absolute executable file, and the resolved path is what
 * the screen prints, so a substitution is visible rather than hidden.
 */
export function resolveTailscale(input: {
  packaged: boolean;
  env: NodeJS.ProcessEnv;
}): TailscaleResolution {
  const override = (input.env['GMUX_TAILSCALE_BIN'] ?? '').trim();

  if (input.packaged) {
    if (override !== '' && !saidPackagedOverrideIgnored) {
      saidPackagedOverrideIgnored = true;
      machinesLog.warn(
        'GMUX_TAILSCALE_BIN is ignored in a packaged Tortie. The application ' +
          'always asks the Tailscale program at one of its pinned paths.'
      );
    }
  } else if (override !== '') {
    if (override.startsWith('/') && isExecutableFile(override)) {
      return {
        path: override,
        source: 'dev-override',
        detail: `GMUX_TAILSCALE_BIN=${override}`
      };
    }
    machinesLog.warn(
      `GMUX_TAILSCALE_BIN does not name an absolute executable file, so it is ` +
        `ignored. The value was ${override}.`
    );
  }

  for (const candidate of TAILSCALE_CANDIDATES) {
    if (isExecutableFile(candidate)) {
      return { path: candidate, source: 'pinned', detail: candidate };
    }
  }
  return {
    path: null,
    source: 'missing',
    detail: TAILSCALE_CANDIDATES.join(', ')
  };
}

/** Test hook, so one process can exercise more than one resolution path. */
export function resetTailscaleWarningsForTests(): void {
  saidPackagedOverrideIgnored = false;
}

// ---------------------------------------------------------------------------
// The parse
// ---------------------------------------------------------------------------

/** One machine, as this module reads it out of the program's JSON. */
export interface TailscaleParsedPeer {
  host: string;
  name: string;
  os: string;
  online: boolean;
  isSelf: boolean;
}

/** A trailing dot on a DNS name is correct and it is not what a person types. */
function trimTrailingDot(text: string): string {
  return text.endsWith('.') ? text.slice(0, -1) : text;
}

function readNode(raw: unknown, isSelf: boolean): TailscaleParsedPeer | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const node = raw as Record<string, unknown>;
  const dns = typeof node['DNSName'] === 'string' ? trimTrailingDot(node['DNSName']) : '';
  const hostName = typeof node['HostName'] === 'string' ? node['HostName'] : '';
  const host = dns.length > 0 ? dns : hostName;
  if (host.length === 0) return null;
  return {
    host,
    name: hostName.length > 0 ? hostName : host,
    os: typeof node['OS'] === 'string' ? node['OS'] : '',
    online: node['Online'] === true,
    isSelf
  };
}

/**
 * Read `tailscale status --json`. Pure.
 *
 * `Self` is included and marked, because a person may legitimately want to
 * point at the Mac they are sitting at. Order is Self first, then the peers
 * sorted by name, so the list does not reshuffle between reads.
 */
export function parseTailscaleStatus(text: string): TailscaleParsedPeer[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return [];
  }
  const root = parsed as Record<string, unknown>;
  const out: TailscaleParsedPeer[] = [];
  const self = readNode(root['Self'], true);
  if (self !== null) out.push(self);
  const peers = root['Peer'];
  if (typeof peers === 'object' && peers !== null && !Array.isArray(peers)) {
    const rows: TailscaleParsedPeer[] = [];
    for (const value of Object.values(peers as Record<string, unknown>)) {
      const peer = readNode(value, false);
      if (peer !== null) rows.push(peer);
    }
    rows.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    out.push(...rows);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The one call
// ---------------------------------------------------------------------------

/** The sentence shown when no Tailscale program is at any pinned path. */
export const TAILSCALE_MISSING_NOTE =
  'Tortie found no Tailscale program on this Mac at the places it looks. ' +
  'Type the machine address yourself below.';

/** The sentence shown when the program answered and listed nothing. */
export const TAILSCALE_EMPTY_NOTE =
  'Tailscale answered and listed no other machines. Type the machine address ' +
  'yourself below.';

/** Run the program and read its answer. Never throws. */
function runTailscale(path: string): Promise<{ stdout: string; error: string }> {
  return new Promise((resolve) => {
    execFile(
      path,
      ['status', '--json'],
      {
        timeout: TAILSCALE_DEADLINE_MS,
        maxBuffer: TAILSCALE_MAX_OUTPUT,
        // No shell, so nothing in the environment can change what runs.
        shell: false,
        encoding: 'utf8'
      },
      (err, stdout) => {
        resolve({ stdout: stdout, error: err === null ? '' : err.message });
      }
    );
  });
}

/**
 * The picker's one call.
 *
 * @param alreadyAdded the addresses `machines.json` already holds, so the list
 *        can mark them rather than offering a duplicate.
 */
export async function readTailnetMachines(input: {
  packaged: boolean;
  env: NodeJS.ProcessEnv;
  alreadyAdded: readonly string[];
}): Promise<TailscaleSourceResult> {
  const resolution = resolveTailscale(input);
  if (resolution.path === null) {
    return {
      binary: null,
      source: 'missing',
      peers: [],
      note: TAILSCALE_MISSING_NOTE
    };
  }
  const added = new Set(input.alreadyAdded.map((host) => host.toLowerCase()));
  const { stdout, error } = await runTailscale(resolution.path);
  const parsed = parseTailscaleStatus(stdout);
  const peers: TailscalePeerView[] = parsed.map((peer) => ({
    host: peer.host,
    name: peer.name,
    os: peer.os,
    online: peer.online,
    isThisMac: peer.isSelf,
    alreadyAdded: added.has(peer.host.toLowerCase())
  }));
  // Self alone is not a tailnet. A person who is logged out sees themselves and
  // nobody else, and the honest answer is the same as an empty list.
  const others = peers.filter((peer) => !peer.isThisMac);
  const note =
    others.length === 0
      ? TAILSCALE_EMPTY_NOTE
      : error.length > 0
        ? TAILSCALE_EMPTY_NOTE
        : null;
  return {
    binary: resolution.path,
    source: resolution.source === 'missing' ? 'pinned' : resolution.source,
    peers,
    note
  };
}
