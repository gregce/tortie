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
 *
 * ## The second caller, `src/main/pocket/funnel.ts` (Phase 330)
 *
 * The phone door is published through Tailscale Funnel, and the program that
 * publishes it is {@link resolveTailscale}'s answer, for the same reason Add
 * Machine runs it: a pinned absolute path, printed where a person reads it (the
 * door's lines name it, and it is a hashed field), and never a bare name found
 * through PATH. There is no second resolver. Funnel adds ONE RULE ON ITS OWN
 * SIDE rather than changing this one: in a development build, a
 * `GMUX_TAILSCALE_BIN` that is set but does not resolve REFUSES there, where
 * this module falls back to the pinned path. For a read of the machine list
 * the fallback is harmless; for Funnel it would run the person's real
 * Tailscale on their tailnet the moment a probe's stand-in path was wrong.
 * Funnel's reads, like this one, inherit the environment and use this module's
 * deadline and output cap.
 *
 * ## The stat in the door's status, and the app's two paths (Phase 333.1)
 *
 * Settings then Phone's first step says whether Tailscale is on this Mac, so
 * the door's `status()` calls {@link resolveTailscale} once per status, through
 * `../pocket/funnel.ts`'s resolver: at most eight `statSync` and `accessSync`
 * calls and NO process. Under an unusable development override that is one
 * warning per status, a development-build limit. The app's bundle and its
 * command line copy are named here, as {@link TAILSCALE_APP_BUNDLE} and
 * {@link TAILSCALE_APP_PROGRAM}, because the pocket domain spells no Tailscale
 * path (`conformance:pocket` U2): Open Tailscale opens the bundle, and only
 * when this run resolved the program to the bundle's own copy.
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

/** The Tailscale app's bundle, which Open Tailscale opens (Phase 333.1, D13). */
export const TAILSCALE_APP_BUNDLE = '/Applications/Tailscale.app';

/** Its command line copy, the first place Tortie looks (Phase 333.1, D13). */
export const TAILSCALE_APP_PROGRAM = `${TAILSCALE_APP_BUNDLE}/Contents/MacOS/Tailscale`;

/**
 * The paths Tortie looks at, in order. The first one that is an executable file
 * wins.
 *
 * The app bundle first, because that is where the Tailscale a person installs
 * from the App Store or from tailscale.com puts its command line copy. Then the
 * two places Homebrew and the standalone installer use.
 */
export const TAILSCALE_CANDIDATES: readonly string[] = [
  TAILSCALE_APP_PROGRAM,
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

/** The tag Tailscale puts on the relays it shares in for Funnel. */
const FUNNEL_RELAY_TAG = 'tag:ingress';

/**
 * True for one of Tailscale's own Funnel relays (Phase 339). Once this Mac
 * publishes through Funnel, `status --json` lists each relay as a peer: shared
 * in (`ShareeNode` true), tagged `tag:ingress`, no `DNSName` and no `OS`
 * (measured 2026-10-05: 23 of 26 peers, every one `funnel-ingress-node`).
 * ALL FOUR must hold, so a machine a person could add is never hidden: a tag is
 * the tailnet owner's to choose, and a peer with a name or an OS stays listed.
 * `HostName` is not asked; with no DNS name there is nothing to dial, whatever
 * the peer calls itself.
 */
function isFunnelRelay(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return false;
  const node = raw as Record<string, unknown>;
  const tags = node['Tags'];
  const dns = typeof node['DNSName'] === 'string' ? trimTrailingDot(node['DNSName']) : '';
  const os = typeof node['OS'] === 'string' ? node['OS'] : '';
  return (
    node['ShareeNode'] === true &&
    Array.isArray(tags) &&
    tags.includes(FUNNEL_RELAY_TAG) &&
    dns.length === 0 &&
    os.length === 0
  );
}

/**
 * Read `tailscale status --json`. Pure.
 *
 * `Self` is included and marked, because a person may legitimately want to
 * point at the Mac they are sitting at. Order is Self first, then the peers
 * sorted by name, so the list does not reshuffle between reads. Tailscale's
 * Funnel relays are left out ({@link isFunnelRelay}), and because the count
 * line counts these same rows, it counts only what is listed.
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
      if (isFunnelRelay(value)) continue;
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
  // The source is whatever the resolver decided. A line here that relabels it is
  // how a screen comes to claim a pinned path Tortie did not run.
  return {
    binary: resolution.path,
    source: resolution.source,
    peers,
    note
  };
}
