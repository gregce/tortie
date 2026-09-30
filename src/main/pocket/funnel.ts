/**
 * The Funnel child: how the door reaches the internet (Phase 330, build/p330/
 * SPEC.md §4.2, research 132 Route 1).
 *
 * The door binds `127.0.0.1` on an ephemeral port and nothing else. The one
 * way anything outside this Mac reaches it is THIS: the Mac's own Tailscale
 * program, run as a foreground child with exactly
 *
 *     <program> funnel --tcp=<publicPort> --proxy-protocol=2 tcp://127.0.0.1:<localPort>
 *
 * which publishes the door at `https://<publicName>:<publicPort>` as RAW TCP,
 * so TLS still ends inside Tortie under the key the pairing code pins (his
 * measurement M2: the phone saw the door's own certificate through the public
 * ingress). Tailscale cannot decrypt what it forwards, and it issues no
 * certificate for the name (M4).
 *
 * ## The program, and the one refusal that keeps an agent off his tailnet
 *
 * It is `resolveTailscale`'s answer (`../machines/tailscale.ts`), the pinned
 * program Add Machine already runs, and there is no second resolver and no
 * literal path here. In a development build `GMUX_TAILSCALE_BIN` substitutes a
 * program, which is how every probe drives a STAND-IN. When that variable is
 * set but unusable, `resolveTailscale` warns and falls back to the pinned path;
 * for Add Machine's read that is harmless, for Funnel it would run HIS REAL
 * Tailscale on his tailnet the moment a probe's wrapper path was wrong. So this
 * module refuses `override-unusable` and never falls back. A packaged build
 * ignores the variable, as it always has.
 *
 * ## What is never run
 *
 * Only three argv shapes reach the program: the status read, the serve-config
 * read, and the foreground funnel above. Never the background flag, never a
 * reset, never an off, never a TLS-terminating mode (a key tailscaled mints per
 * certificate cannot be pinned, `ipn/ipnlocal/cert.go:646`), never port 443.
 * `conformance:pocket` U1 holds the argv as text.
 *
 * ## What counts as published
 *
 * Only a read-back. The child printing `Available on the internet:` is the cue,
 * and a fresh `serve status --json` must then show a foreground entry that
 * forwards `<publicPort>` to exactly this door, with the PROXY header on and TLS
 * NOT terminated, and Funnel on for `<publicName>:<publicPort>`. Any exit before
 * that is a refusal with its own sentence, exit 0 included.
 *
 * ## Its end, and the orphan
 *
 * SIGINT (the child's documented exit, which makes tailscaled delete the
 * foreground session), then SIGTERM, then SIGKILL in a `finally`. The child's
 * pid, `ps` start time and `ps` command line are recorded at 0o600, in a
 * directory of the record's own narrowed to 0o700, because a foreground funnel
 * does not watch its parent: a crashed Tortie leaves it publishing. At the
 * next start the record is compared with `ps`, and ONLY a process matching
 * both the start time and the command line is ended. Tortie never ends what it
 * cannot prove it started.
 *
 * The record is taken straight after the spawn, and TAKEN AGAIN at the
 * child's first line of output and at the counted start (the Phase 330 fix
 * round): a program that `exec`s (the probes' `/bin/sh` wrapper does) prints
 * one command line before its `exec` and another after, and a record of the
 * first would leave a crashed run's orphan unprovable. The start time does not
 * move across an `exec`; only the command line does.
 *
 * ## What this module does not do
 *
 * It holds no credential and calls no LocalAPI: the program is asked, never its
 * socket. It logs no line of the child's output, because both streams carry the
 * node's name and the approval URL; a log line carries a reason WORD. It opens
 * no URL: the owner asks {@link approvalOpens} and opens one only on a press.
 */

import { execFile, spawn as spawnChild } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';

import { POCKET_PUBLIC_PORTS, type PocketFunnelRefusal } from '@shared/ipc/pocket';
import { getLog } from '../log';
import {
  TAILSCALE_DEADLINE_MS,
  TAILSCALE_MAX_OUTPUT,
  resolveTailscale,
  type TailscaleResolution
} from '../machines/tailscale';

const log = getLog('pocket');

// ---------------------------------------------------------------------------
// Constants (SPEC §8)
// ---------------------------------------------------------------------------

/** The public ports, in the order they are tried. Never 443. */
export const FUNNEL_PORTS: readonly number[] = POCKET_PUBLIC_PORTS;

/** A start, not counting an approval wait, is given this long. */
export const FUNNEL_START_DEADLINE_MS = 20_000;

/** How long Tortie waits on Tailscale's approval page. */
export const FUNNEL_APPROVAL_WAIT_MS = 10 * 60_000;

/** After SIGINT, wait this long before SIGTERM. */
export const FUNNEL_STOP_INT_MS = 2_000;

/** After SIGTERM, wait this long before SIGKILL. */
export const FUNNEL_STOP_TERM_MS = 1_000;

/** After SIGKILL, wait this long to see the process gone. */
export const FUNNEL_STOP_KILL_MS = 500;

/** The quit's bound on every child's stop. */
export const FUNNEL_JOIN_MS = 3_000;

/** The first restart comes this long after an unexpected exit. */
export const FUNNEL_RESTART_FLOOR_MS = 2_000;

/** And the spacing doubles to this, never beyond. */
export const FUNNEL_RESTART_CAP_MS = 60_000;

/** Output kept per stream. Nothing kept is ever logged. */
export const FUNNEL_OUTPUT_CAP_BYTES = 64 * 1024;

/** The read-back is tried this many times, this far apart. */
export const FUNNEL_READBACK_TRIES = 3;
export const FUNNEL_READBACK_GAP_MS = 250;

/** How often a pid is asked whether it is gone while it is being ended. */
const PID_POLL_MS = 100;

/** The only host whose approval page Tortie will open. */
export const FUNNEL_APPROVAL_HOST = 'login.tailscale.com';

/** What `Available on the internet:` is, verbatim (`serve_v2.go:950`). */
const MSG_FUNNEL_AVAILABLE = 'Available on the internet:';

/** What the CLI prints once the approval landed (`serve_legacy.go:863`). */
const MSG_SUCCESS = 'Success.';

/** The capability keys whose presence means Funnel is already approved. */
const CAP_HTTPS = 'https';
const CAP_FUNNEL = 'funnel';
const CAP_FUNNEL_PORTS = 'https://tailscale.com/cap/funnel-ports';

// ---------------------------------------------------------------------------
// The seams. Every process goes through these, and the tests never exec a
// real program.
// ---------------------------------------------------------------------------

/** What one `execFile` answered. It never throws. */
export interface FunnelExecResult {
  readonly stdout: string;
  readonly stderr: string;
  /** The exit code, or null when there was none (a signal, a spawn error). */
  readonly code: number | null;
  /** True when the program failed in any way, a non-zero exit included. */
  readonly failed: boolean;
  /** The spawn's own error code, e.g. `ENOENT`, when it never ran. */
  readonly errno: string | null;
}

/** The child, as this module drives it. A `ChildProcess` is one. */
export interface FunnelChild {
  readonly pid?: number | undefined;
  readonly stdout: NodeJS.ReadableStream | null;
  readonly stderr: NodeJS.ReadableStream | null;
  kill(signal: NodeJS.Signals): boolean;
  /**
   * `close`, not `exit`: Node may emit `exit` before the pipes have drained,
   * and the refusal is read from the last lines of stderr.
   */
  once(event: 'close', listener: (code: number | null, signal: NodeJS.Signals | null) => void): unknown;
  once(event: 'error', listener: (err: Error) => void): unknown;
}

/** Where the program came from, and whether a development override was set. */
export interface FunnelResolution {
  readonly resolution: TailscaleResolution;
  /** True only in a development build with `GMUX_TAILSCALE_BIN` set. */
  readonly overrideSet: boolean;
}

/** What `ps` says a pid is. */
export interface PsFacts {
  readonly lstart: string;
  readonly command: string;
}

export interface FunnelDeps {
  resolve(): FunnelResolution;
  exec(file: string, args: readonly string[], options?: { env?: NodeJS.ProcessEnv }): Promise<FunnelExecResult>;
  spawn(file: string, args: readonly string[]): FunnelChild;
  /** `ps`'s start time and command line for a pid, or null when it has none. */
  ps(pid: number): Promise<PsFacts | null>;
  /** Signal a pid; `0` asks whether it is alive. False when the signal failed. */
  kill(pid: number, signal: NodeJS.Signals | 0): boolean;
  recordPath(): string;
  now(): number;
  sleep(ms: number): Promise<void>;
}

function isPackaged(): boolean {
  try {
    return app.isPackaged;
  } catch {
    return false; // not an Electron run
  }
}

/** The program as this run resolves it, from the process's own environment. */
export function resolveFunnelProgram(input: {
  packaged: boolean;
  env: NodeJS.ProcessEnv;
}): FunnelResolution {
  return {
    resolution: resolveTailscale(input),
    overrideSet: !input.packaged && (input.env['GMUX_TAILSCALE_BIN'] ?? '').trim() !== ''
  };
}

function execReal(
  file: string,
  args: readonly string[],
  options?: { env?: NodeJS.ProcessEnv }
): Promise<FunnelExecResult> {
  return new Promise((resolve) => {
    execFile(
      file,
      [...args],
      {
        timeout: TAILSCALE_DEADLINE_MS,
        maxBuffer: TAILSCALE_MAX_OUTPUT,
        // No shell, so nothing in the environment can change what runs.
        shell: false,
        encoding: 'utf8',
        // INHERITED unless named: the macsys CLI finds its daemon over XPC and
        // needs HOME, and a narrowed environment is unmeasured against it.
        ...(options?.env !== undefined ? { env: options.env } : {})
      },
      (err, stdout, stderr) => {
        const e = err as (NodeJS.ErrnoException & { code?: unknown }) | null;
        resolve({
          stdout: typeof stdout === 'string' ? stdout : '',
          stderr: typeof stderr === 'string' ? stderr : '',
          code: e === null ? 0 : typeof e.code === 'number' ? e.code : null,
          failed: e !== null,
          errno: e !== null && typeof e.code === 'string' ? e.code : null
        });
      }
    );
  });
}

/** `ps` reads, run with one locale and one zone so two reads format alike. */
async function psReal(pid: number): Promise<PsFacts | null> {
  if (!Number.isInteger(pid) || pid <= 1) return null;
  const env = { LC_ALL: 'C', TZ: 'UTC0' };
  const started = await execReal('/bin/ps', ['-p', String(pid), '-o', 'lstart='], { env });
  const command = await execReal('/bin/ps', ['-p', String(pid), '-ww', '-o', 'command='], { env });
  if (started.failed || command.failed) return null;
  const lstart = started.stdout.trim();
  const line = command.stdout.trim();
  if (lstart.length === 0 || line.length === 0) return null;
  return { lstart, command: line };
}

/** The shipping seams. */
export function defaultFunnelDeps(): FunnelDeps {
  return {
    resolve: () => resolveFunnelProgram({ packaged: isPackaged(), env: process.env }),
    exec: execReal,
    spawn: (file, args) =>
      spawnChild(file, [...args], {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      }),
    ps: psReal,
    kill: (pid, signal) => {
      try {
        process.kill(pid, signal);
        return true;
      } catch {
        return false;
      }
    },
    // A DIRECTORY OF THE RECORD'S OWN, so narrowing it to 0o700 never narrows
    // `<userData>/gmux`, which everything else of Tortie's sits in.
    recordPath: () => join(app.getPath('userData'), 'gmux', 'pocket-funnel', 'record.json'),
    now: () => Date.now(),
    sleep: (ms) =>
      new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        timer.unref?.();
      })
  };
}

// ---------------------------------------------------------------------------
// The program
// ---------------------------------------------------------------------------

export type FunnelProgram =
  | { readonly ok: true; readonly path: string; readonly source: TailscaleResolution['source'] }
  | { readonly ok: false; readonly reason: 'override-unusable' | 'no-tailscale' };

/**
 * The program Funnel runs, or the refusal. AN OVERRIDE THAT IS SET AND DID NOT
 * RESOLVE REFUSES, and never falls back to the pinned path: a wrong wrapper path
 * in a probe must never start his real Tailscale on his tailnet.
 */
export function funnelProgramOf(resolved: FunnelResolution): FunnelProgram {
  if (resolved.overrideSet && resolved.resolution.source !== 'dev-override') {
    return { ok: false, reason: 'override-unusable' };
  }
  const path = resolved.resolution.path;
  if (path === null || resolved.resolution.source === 'missing') {
    return { ok: false, reason: 'no-tailscale' };
  }
  return { ok: true, path, source: resolved.resolution.source };
}

// ---------------------------------------------------------------------------
// The two reads, parsed. Pure.
// ---------------------------------------------------------------------------

function objectOf(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Is this a name a phone will dial? The same rule the phone applies to the
 * code's `host` (SPEC §4.8.1): lowercase, at most 253 characters, ending
 * `.ts.net`, at least three labels, each `[a-z0-9-]{1,63}` and not starting or
 * ending with `-`. A name the phone would refuse is refused here first.
 */
export function isPublicNameShape(name: string): boolean {
  if (name.length === 0 || name.length > 253) return false;
  if (name !== name.toLowerCase()) return false;
  if (!name.endsWith('.ts.net')) return false;
  const labels = name.split('.');
  if (labels.length < 3) return false;
  return labels.every(
    (label) => /^[a-z0-9-]{1,63}$/.test(label) && !label.startsWith('-') && !label.endsWith('-')
  );
}

/** An inclusive port range from the funnel-ports capability. */
export type PortRange = readonly [number, number];

/** `?ports=443,8443,10000-10010` → ranges. Null when the key carries none. */
export function parseFunnelPorts(key: string): PortRange[] | null {
  let url: URL;
  try {
    url = new URL(key);
  } catch {
    return null;
  }
  const ports = url.searchParams.get('ports');
  if (ports === null || ports.length === 0) return null;
  const out: PortRange[] = [];
  for (const part of ports.split(',')) {
    if (part.length === 0) continue;
    const [first, last] = part.split('-');
    const a = Number(first);
    const b = last === undefined ? a : Number(last);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b > 65_535 || a > b) continue;
    out.push([a, b]);
  }
  return out;
}

/** What `status --json --peers=false` said, or which refusal it is. */
export type StatusFacts =
  | {
      readonly ok: true;
      readonly tailnet: string;
      readonly publicName: string;
      /** True when this Mac lacks Funnel's two capabilities: the start asks. */
      readonly asksApproval: boolean;
      /** The funnel-ports capability's ranges, or null when it is absent. */
      readonly funnelPorts: readonly PortRange[] | null;
    }
  | { readonly ok: false; readonly reason: PocketFunnelRefusal };

/**
 * Read `tailscale status --json --peers=false` (`ipn/ipnstate/ipnstate.go`).
 * Only `BackendState`, `Self` and `CurrentTailnet` are read: the flag asks for
 * the answer WITHOUT his other devices, so their names are never in it.
 */
export function parseTailnetStatus(text: string): StatusFacts {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
  const root = objectOf(parsed);
  if (root === null) return { ok: false, reason: 'unreadable' };
  const backend = root['BackendState'];
  if (typeof backend !== 'string') return { ok: false, reason: 'unreadable' };
  if (backend === 'NeedsLogin' || backend === 'NeedsMachineAuth') {
    return { ok: false, reason: 'signed-out' };
  }
  if (backend === 'Stopped' || backend === 'Starting' || backend === 'NoState') {
    return { ok: false, reason: 'not-running' };
  }
  if (backend !== 'Running') return { ok: false, reason: 'unreadable' };
  const current = root['CurrentTailnet'];
  if (current === null || current === undefined) return { ok: false, reason: 'signed-out' };
  const tailnetRow = objectOf(current);
  if (tailnetRow === null) return { ok: false, reason: 'unreadable' };
  const tailnet = tailnetRow['Name'];
  if (typeof tailnet !== 'string' || tailnet.length === 0) {
    return { ok: false, reason: 'signed-out' };
  }
  const self = objectOf(root['Self']);
  if (self === null) return { ok: false, reason: 'unreadable' };
  const dns = self['DNSName'];
  if (typeof dns !== 'string') return { ok: false, reason: 'unreadable' };
  const publicName = (dns.endsWith('.') ? dns.slice(0, -1) : dns).toLowerCase();
  if (publicName.length === 0 || !isPublicNameShape(publicName)) {
    return { ok: false, reason: 'no-name' };
  }
  const caps = new Set<string>();
  const capMap = objectOf(self['CapMap']);
  if (capMap !== null) for (const key of Object.keys(capMap)) caps.add(key);
  const capList = self['Capabilities'];
  if (Array.isArray(capList)) {
    for (const cap of capList) if (typeof cap === 'string') caps.add(cap);
  }
  let funnelPorts: PortRange[] | null = null;
  for (const cap of caps) {
    if (cap.startsWith(CAP_FUNNEL_PORTS)) {
      funnelPorts = parseFunnelPorts(cap);
      if (funnelPorts !== null) break;
    }
  }
  return {
    ok: true,
    tailnet,
    publicName,
    asksApproval: !(caps.has(CAP_HTTPS) && caps.has(CAP_FUNNEL)),
    funnelPorts
  };
}

/** One TCP handler of a serve config, as far as this module reads it. */
interface TcpHandlerLike {
  readonly TCPForward?: unknown;
  readonly TerminateTLS?: unknown;
  readonly ProxyProtocol?: unknown;
  readonly HTTPS?: unknown;
  readonly HTTP?: unknown;
}

/** A serve config (`ipn/serve.go:52-80`), as far as this module reads it. */
export interface ServeConfigLike {
  readonly TCP?: Record<string, TcpHandlerLike | null>;
  readonly Web?: Record<string, unknown>;
  readonly AllowFunnel?: Record<string, unknown>;
  readonly Foreground?: Record<string, ServeConfigLike | null>;
}

/**
 * Read `tailscale serve status --json`. JSON `null` is "nothing is served".
 * Undefined when the text is not a serve config at all.
 */
export function parseServeStatus(text: string): ServeConfigLike | null | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.trim().length === 0 ? 'null' : text);
  } catch {
    return undefined;
  }
  if (parsed === null) return null;
  const root = objectOf(parsed);
  return root === null ? undefined : (root as ServeConfigLike);
}

/** The ports one config level holds: its TCP keys and its Web keys' ports. */
function levelPorts(level: ServeConfigLike | null | undefined, into: Map<number, string | null>): void {
  if (level === null || level === undefined) return;
  const tcp = objectOf(level.TCP);
  if (tcp !== null) {
    for (const [key, handler] of Object.entries(tcp)) {
      const port = Number(key);
      if (!Number.isInteger(port)) continue;
      const forward = objectOf(handler)?.['TCPForward'];
      // A port held twice is held; the first target seen is what is kept.
      if (!into.has(port)) into.set(port, typeof forward === 'string' ? forward : null);
    }
  }
  const web = objectOf(level.Web);
  if (web !== null) {
    for (const key of Object.keys(web)) {
      const port = Number(key.slice(key.lastIndexOf(':') + 1));
      if (Number.isInteger(port) && !into.has(port)) into.set(port, null);
    }
  }
}

/**
 * Which ports his serve config holds, at the top level and in every
 * foreground session, EXCEPT an entry forwarding to `exceptTarget`, which is
 * this door's own child and holds its port for the door.
 */
export function portsHeld(
  config: ServeConfigLike | null,
  exceptTarget: string | null = null
): Set<number> {
  const holders = new Map<number, string | null>();
  const held = new Set<number>();
  const collect = (level: ServeConfigLike | null | undefined): void => {
    holders.clear();
    levelPorts(level, holders);
    for (const [port, target] of holders) {
      if (exceptTarget !== null && target === exceptTarget) continue;
      held.add(port);
    }
  };
  collect(config);
  const foreground = objectOf(config?.Foreground);
  if (foreground !== null) {
    for (const session of Object.values(foreground)) collect(session as ServeConfigLike | null);
  }
  return held;
}

/** The loopback target the child forwards to. One spelling. */
export function funnelTarget(localPort: number): string {
  return `127.0.0.1:${String(localPort)}`;
}

/**
 * The counted start's read-back (`ipn/serve.go:432-444`, SPEC §4.2.5): a
 * foreground entry whose `TCP["<publicPort>"]` forwards to exactly this door,
 * with PROXY v2 and NO terminated TLS, and whose `AllowFunnel` has
 * `<publicName>:<publicPort>` true.
 */
export function servesThisDoor(
  config: ServeConfigLike | null,
  door: { publicName: string; publicPort: number; localPort: number }
): boolean {
  const foreground = objectOf(config?.Foreground);
  if (foreground === null) return false;
  for (const raw of Object.values(foreground)) {
    const session = objectOf(raw);
    if (session === null) continue;
    const handler = objectOf(objectOf(session['TCP'])?.[String(door.publicPort)]);
    if (handler === null) continue;
    if (handler['TCPForward'] !== funnelTarget(door.localPort)) continue;
    if (handler['ProxyProtocol'] !== 2) continue;
    if (typeof handler['TerminateTLS'] === 'string' && handler['TerminateTLS'].length > 0) continue;
    if (handler['HTTPS'] === true || handler['HTTP'] === true) continue;
    const allow = objectOf(session['AllowFunnel']);
    if (allow?.[`${door.publicName}:${String(door.publicPort)}`] !== true) continue;
    return true;
  }
  return false;
}

/** Is `port` inside the funnel-ports ranges? Null ranges allow every port. */
function portAllowed(port: number, ranges: readonly PortRange[] | null): boolean {
  if (ranges === null) return true;
  return ranges.some(([a, b]) => port >= a && port <= b);
}

/**
 * Choose the public port (SPEC §4.2.3): keep `stored` when it is 8443 or 10000
 * and neither held nor outside the tailnet's funnel ports; otherwise 8443, else
 * 10000. Never 443. `ports-taken` when both are held; `funnel-ports` when one
 * is free but the tailnet's policy allows neither.
 */
export function choosePublicPort(
  stored: number,
  held: ReadonlySet<number>,
  funnelPorts: readonly PortRange[] | null
): { ok: true; port: number } | { ok: false; reason: 'ports-taken' | 'funnel-ports' } {
  const usable = (port: number): boolean => !held.has(port) && portAllowed(port, funnelPorts);
  if (FUNNEL_PORTS.includes(stored) && usable(stored)) return { ok: true, port: stored };
  for (const port of FUNNEL_PORTS) if (usable(port)) return { ok: true, port };
  if (FUNNEL_PORTS.some((port) => !held.has(port))) return { ok: false, reason: 'funnel-ports' };
  return { ok: false, reason: 'ports-taken' };
}

/**
 * THE ARGV, EXACTLY (SPEC §4.2.4). The program is not in it: it is the file
 * the spawn runs. `conformance:pocket` U1 reads this function as text.
 */
export function funnelArgv(publicPort: number, localPort: number): readonly string[] {
  return ['funnel', `--tcp=${String(publicPort)}`, '--proxy-protocol=2', `tcp://${funnelTarget(localPort)}`];
}

/**
 * May Tortie open this approval URL? Only an `https:` page on exactly
 * `login.tailscale.com`, with no explicit port and no user name or password.
 * Anything else is drawn as text and never opened.
 */
export function approvalOpens(text: string | null): boolean {
  if (text === null) return false;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:' &&
    url.hostname === FUNNEL_APPROVAL_HOST &&
    url.username === '' &&
    url.password === '' &&
    // NO PORT, asked of the TEXT rather than of `url.port`, because `new URL`
    // drops an explicit :443 and a page that names any port at all is not the
    // page Tailscale prints.
    !/^https:\/\/[^/@]*:\d/i.test(text.trim())
  );
}

/** A line the CLI printed that is an approval URL (`serve_legacy.go:814-818`). */
function approvalUrlOf(line: string): string | null {
  const trimmed = line.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    new URL(trimmed);
  } catch {
    return null;
  }
  return trimmed;
}

/**
 * Why a child that exited before a counted start refused (SPEC §4.2.5). The
 * rules are asked in order and the first to match wins. EXIT 0 IS A REFUSAL.
 */
export function classifyFunnelExit(input: {
  stderr: string;
  code: number | null;
  urlSeen: boolean;
}): PocketFunnelRefusal {
  const e = input.stderr;
  if (e.includes('shields-up')) return 'shields-up';
  if (e.includes('is not allowed for funnel')) return 'funnel-ports';
  if (e.includes('Funnel not available')) return 'not-approved';
  if (
    e.includes('listener already exists for port') ||
    e.includes('foreground listener already exists') ||
    e.includes('is already serving') ||
    e.includes('already serving web')
  ) {
    return 'port-taken';
  }
  if (e.includes('Another client is changing the serve config')) return 'busy';
  if (input.code === 0 && input.urlSeen) return 'not-approved';
  return 'failed';
}

// ---------------------------------------------------------------------------
// The read
// ---------------------------------------------------------------------------

/** What one read of Tailscale answered. */
export type TailnetRead =
  | {
      readonly ok: true;
      readonly funnelProgram: string;
      readonly programSource: TailscaleResolution['source'];
      readonly tailnet: string;
      readonly publicName: string;
      readonly asksApproval: boolean;
      readonly funnelPorts: readonly PortRange[] | null;
      /** His serve config as read now; null when nothing is served. */
      readonly serve: ServeConfigLike | null;
    }
  | { readonly ok: false; readonly reason: PocketFunnelRefusal };

function execRefusal(result: FunnelExecResult): PocketFunnelRefusal {
  if (result.errno === 'ENOENT' || result.errno === 'EACCES') return 'no-tailscale';
  if (
    result.stderr.includes('failed to connect to local') ||
    result.stderr.includes('is not running') ||
    result.stderr.includes('doesn’t appear to be running') ||
    result.stderr.includes("doesn't appear to be running")
  ) {
    return 'not-running';
  }
  return 'unreadable';
}

/**
 * Read Tailscale: the status (with no peers) and the serve config. Two
 * `execFile`s of the resolved program and nothing else. Reached from a person's
 * press or a confirmed start, never from opening a sheet and never on a timer.
 */
export async function readTailnet(deps: FunnelDeps): Promise<TailnetRead> {
  const program = funnelProgramOf(deps.resolve());
  if (!program.ok) return { ok: false, reason: program.reason };
  const status = await deps.exec(program.path, ['status', '--json', '--peers=false']);
  const facts = parseTailnetStatus(status.stdout);
  if (!facts.ok) {
    // A program that could not answer at all says why better than its stdout.
    return { ok: false, reason: status.failed && facts.reason === 'unreadable' ? execRefusal(status) : facts.reason };
  }
  const serve = await readServe(deps, program.path);
  if (serve === undefined) return { ok: false, reason: 'unreadable' };
  return {
    ok: true,
    funnelProgram: program.path,
    programSource: program.source,
    tailnet: facts.tailnet,
    publicName: facts.publicName,
    asksApproval: facts.asksApproval,
    funnelPorts: facts.funnelPorts,
    serve
  };
}

/** `serve status --json` alone, of a program already resolved. */
export async function readServe(
  deps: FunnelDeps,
  program: string
): Promise<ServeConfigLike | null | undefined> {
  const served = await deps.exec(program, ['serve', 'status', '--json']);
  if (served.failed) return undefined;
  return parseServeStatus(served.stdout);
}

// ---------------------------------------------------------------------------
// The record, and the orphan it lets Tortie prove
// ---------------------------------------------------------------------------

/** What `<userData>/gmux/pocket-funnel/record.json` holds. */
export interface FunnelRecord {
  readonly pid: number;
  /** `ps -o lstart=` under `LC_ALL=C TZ=UTC0`. */
  readonly lstart: string;
  /** `ps -ww -o command=`, AS PS PRINTS IT: this is what is matched. */
  readonly command: string;
  /** The spawn's argv, for the log only: a wrapper prints differently. */
  readonly argv: readonly string[];
  readonly at: number;
}

/**
 * Write the record at 0o600 in a 0o700 directory, atomically. The directory is
 * NARROWED every time, not only when it is made: `mkdirSync`'s mode applies to
 * a directory it creates and to nothing that already exists, and the verifier
 * measured the first build's record at 0600 in a 0755 `<userData>/gmux`.
 */
export function writeFunnelRecord(path: string, record: FunnelRecord): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  chmodSync(dirname(path), 0o700);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  renameSync(tmp, path);
}

/** The record, or null when there is none or it is not one. */
export function readFunnelRecord(path: string): FunnelRecord | null {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
  const r = objectOf(raw);
  if (r === null) return null;
  const pid = r['pid'];
  const lstart = r['lstart'];
  const command = r['command'];
  if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 1) return null;
  if (typeof lstart !== 'string' || lstart.length === 0) return null;
  if (typeof command !== 'string' || command.length === 0) return null;
  const argv = Array.isArray(r['argv']) ? r['argv'].filter((a): a is string => typeof a === 'string') : [];
  const at = typeof r['at'] === 'number' ? r['at'] : 0;
  return { pid, lstart, command, argv, at };
}

function deleteRecord(path: string, pid?: number): void {
  try {
    if (pid !== undefined) {
      const held = readFunnelRecord(path);
      // Only the record of THIS child: a newer child's record is not ours.
      if (held !== null && held.pid !== pid) return;
    }
    rmSync(path, { force: true });
  } catch {
    /* a record that cannot be removed is swept at the next start */
  }
}

/** Wait until `pid` is gone, polling, or `ms` passes. True when it is gone. */
async function pidGoneWithin(deps: FunnelDeps, pid: number, ms: number): Promise<boolean> {
  const polls = Math.max(1, Math.ceil(ms / PID_POLL_MS));
  for (let i = 0; i < polls; i += 1) {
    if (!deps.kill(pid, 0)) return true;
    await deps.sleep(PID_POLL_MS);
  }
  return !deps.kill(pid, 0);
}

/** End a pid Tortie proved it started: SIGINT, SIGTERM, then SIGKILL. */
async function endPid(deps: FunnelDeps, pid: number): Promise<boolean> {
  let gone = false;
  try {
    deps.kill(pid, 'SIGINT');
    gone = await pidGoneWithin(deps, pid, FUNNEL_STOP_INT_MS);
    if (!gone) {
      deps.kill(pid, 'SIGTERM');
      gone = await pidGoneWithin(deps, pid, FUNNEL_STOP_TERM_MS);
    }
  } finally {
    if (!gone) {
      deps.kill(pid, 'SIGKILL');
      gone = await pidGoneWithin(deps, pid, FUNNEL_STOP_KILL_MS);
    }
  }
  return gone;
}

/**
 * Does a recorded command line end in the argv Tortie spawns: exactly
 * {@link funnelArgv} for a public port in {@link FUNNEL_PORTS} and a local
 * port, after the program? (The Phase 330 fix round after his ruling of
 * 2026-09-29.) `ps` prints the argv joined by single spaces, which is what the
 * record holds. The comparison is against `funnelArgv` itself, so the argv is
 * spelled in one place. A record is a file on his disk: one that names
 * anything else is no child of Tortie's, whatever `ps` then says of its pid.
 */
export function recordNamesFunnelChild(command: string): boolean {
  const at = command.lastIndexOf(' funnel ');
  if (at === -1) return false;
  const tail = command.slice(at + 1);
  const words = tail.split(' ');
  if (words.length !== 4) return false;
  const publicPort = Number(/=(\d{1,5})$/.exec(words[1] ?? '')?.[1] ?? Number.NaN);
  const localPort = Number(/:(\d{1,5})$/.exec(words[3] ?? '')?.[1] ?? Number.NaN);
  if (!FUNNEL_PORTS.includes(publicPort)) return false;
  if (!Number.isInteger(localPort) || localPort < 1 || localPort > 65_535) return false;
  return funnelArgv(publicPort, localPort).join(' ') === tail;
}

/** What the sweep did, as a word a test and a log line read. */
export type SweepOutcome = 'none' | 'gone' | 'ended' | 'left-alone' | 'still-running';

/**
 * The orphan sweep (SPEC §4.2.6). Run at the start of every door job that
 * would spawn, so also at launch before anything starts.
 *
 * NO RECORD MEANS NO `ps` AT ALL, so a person who never turned the door on
 * spawns nothing. With a record, `ps` reads the pid, and the process is ended
 * ONLY when its start time AND its command line both equal the record. Fewer
 * matching, nothing is signalled. The record is deleted either way, unless a
 * matched process outlived its SIGKILL: that record is kept, and the caller
 * refuses `port-taken`. A record whose command does not end in the argv
 * Tortie spawns ({@link recordNamesFunnelChild}) is left alone before `ps` is
 * asked anything, and removed.
 */
export async function sweepFunnelOrphan(deps: FunnelDeps): Promise<SweepOutcome> {
  const path = deps.recordPath();
  const record = readFunnelRecord(path);
  if (record === null) {
    deleteRecord(path);
    return 'none';
  }
  // A child of THIS run is not an orphan, whatever the record says.
  for (const run of live) {
    if (run.pid === record.pid) return 'none';
  }
  // A record naming anything but a Funnel child Tortie spawned is no proof,
  // whatever `ps` says of its pid: it is left alone, and removed.
  if (!recordNamesFunnelChild(record.command)) {
    log.warn('left a process alone: its record names no Funnel child');
    deleteRecord(path);
    return 'left-alone';
  }
  const now = await deps.ps(record.pid);
  if (now === null) {
    deleteRecord(path);
    return 'gone';
  }
  if (now.lstart !== record.lstart || now.command !== record.command) {
    log.warn('left a process alone: it does not match the record');
    deleteRecord(path);
    return 'left-alone';
  }
  const ended = await endPid(deps, record.pid);
  if (!ended) {
    log.warn('a Funnel child a previous run left behind would not end');
    return 'still-running';
  }
  log.info('ended a Funnel child a previous run left behind');
  deleteRecord(path);
  return 'ended';
}

// ---------------------------------------------------------------------------
// One child
// ---------------------------------------------------------------------------

/** Every child this process holds, for the quit's join. */
const live = new Set<FunnelRun>();

/** True from the first line of {@link beginFunnelShutdown}. */
let quitting = false;

/** Resolves at the quit's first line, so a start in flight stops waiting. */
let quitNow: () => void = () => undefined;
let quitSignal: Promise<void> = new Promise((resolve) => {
  quitNow = resolve;
});

/** Every restart timer armed, cleared by the quit. */
const restartTimers = new Set<() => void>();

/** Lines from one stream, kept to {@link FUNNEL_OUTPUT_CAP_BYTES}. */
class StreamLines {
  private partial = '';
  private keptBytes = 0;
  readonly kept: string[] = [];

  constructor(private readonly emit: (line: string) => void) {}

  push(chunk: Buffer | string): void {
    this.partial += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    let newline = this.partial.indexOf('\n');
    while (newline >= 0) {
      this.line(this.partial.slice(0, newline).replace(/\r$/, ''));
      this.partial = this.partial.slice(newline + 1);
      newline = this.partial.indexOf('\n');
    }
    // A line longer than the cap is cut, never grown without bound.
    if (this.partial.length > FUNNEL_OUTPUT_CAP_BYTES) {
      this.line(this.partial.slice(0, FUNNEL_OUTPUT_CAP_BYTES));
      this.partial = '';
    }
  }

  end(): void {
    if (this.partial.length > 0) this.line(this.partial);
    this.partial = '';
  }

  private line(text: string): void {
    const bytes = Buffer.byteLength(text, 'utf8') + 1;
    if (this.keptBytes + bytes <= FUNNEL_OUTPUT_CAP_BYTES) {
      this.kept.push(text);
      this.keptBytes += bytes;
    }
    this.emit(text);
  }

  text(): string {
    return this.kept.join('\n');
  }
}

export interface FunnelExit {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}

/**
 * One Funnel child, from its spawn to its stop. It is what the owner holds
 * while the door is published, and what the quit's join ends.
 */
export class FunnelRun {
  readonly pid: number | undefined;
  private exitInfo: FunnelExit | null = null;
  private readonly exited: Promise<FunnelExit>;
  private stopRequested = false;
  private stopping: Promise<boolean> | null = null;
  private readonly exitListeners = new Set<(unexpected: boolean) => void>();
  private handler: ((stream: 'out' | 'err', line: string) => void) | null = null;
  private readonly pending: Array<['out' | 'err', string]> = [];
  /** The record's writes, one after another, so the last `ps` read is the one kept. */
  private recording: Promise<boolean> = Promise.resolve(false);
  /** True once the child's first line of output has asked for the record again. */
  private rerecorded = false;
  readonly out: StreamLines;
  readonly err: StreamLines;

  constructor(
    private readonly child: FunnelChild,
    private readonly deps: FunnelDeps,
    readonly argv: readonly string[]
  ) {
    this.pid = child.pid;
    const dispatch = (stream: 'out' | 'err') => (line: string) => {
      // ITS FIRST LINE, WHICHEVER STREAM: whatever the program `exec`s into
      // has run by now, so the command line `ps` prints is its last one.
      if (!this.rerecorded) {
        this.rerecorded = true;
        void this.record();
      }
      if (this.handler === null) this.pending.push([stream, line]);
      else this.handler(stream, line);
    };
    this.out = new StreamLines(dispatch('out'));
    this.err = new StreamLines(dispatch('err'));
    child.stdout?.on('data', (chunk: Buffer | string) => this.out.push(chunk));
    child.stderr?.on('data', (chunk: Buffer | string) => this.err.push(chunk));
    this.exited = new Promise((resolve) => {
      const settle = (code: number | null, signal: NodeJS.Signals | null): void => {
        if (this.exitInfo !== null) return;
        this.out.end();
        this.err.end();
        this.exitInfo = { code, signal };
        live.delete(this);
        resolve(this.exitInfo);
        const unexpected = !this.stopRequested;
        for (const cb of [...this.exitListeners]) {
          try {
            cb(unexpected);
          } catch {
            /* one listener failing must not stop the next */
          }
        }
      };
      child.once('close', settle);
      // A spawn that failed (ENOENT) emits `error` and may never emit `close`.
      child.once('error', () => settle(null, null));
    });
    live.add(this);
  }

  /** True until the child has exited. */
  get alive(): boolean {
    return this.exitInfo === null;
  }

  get exit(): FunnelExit | null {
    return this.exitInfo;
  }

  /** Resolves when the child has exited, however. */
  whenExited(): Promise<FunnelExit> {
    return this.exited;
  }

  /** `cb(true)` when it exits without having been asked to. */
  onExit(cb: (unexpected: boolean) => void): () => void {
    this.exitListeners.add(cb);
    return () => {
      this.exitListeners.delete(cb);
    };
  }

  /** Receive every line, the ones already printed first. */
  onLine(handler: (stream: 'out' | 'err', line: string) => void): void {
    this.handler = handler;
    for (const [stream, line] of this.pending.splice(0)) handler(stream, line);
  }

  /**
   * Record the child from what `ps` prints: straight after its spawn, at its
   * first line of output, and at the counted start. Each call waits for the one
   * before it, so the record on disk is the latest reading. NOTHING IS WRITTEN
   * once a stop has begun: the stop deletes the record after the child ends,
   * and a write that landed after that delete would name a dead pid.
   */
  record(): Promise<boolean> {
    this.recording = this.recording.then(() => this.recordOnce()).catch(() => false);
    return this.recording;
  }

  private async recordOnce(): Promise<boolean> {
    if (this.pid === undefined || !this.alive || this.stopRequested) return false;
    let facts: PsFacts | null;
    try {
      facts = await this.deps.ps(this.pid);
    } catch {
      facts = null;
    }
    // Asked again after the await, and the write below is synchronous, so a
    // stop that began while `ps` ran is never followed by a write.
    if (facts === null || !this.alive || this.stopRequested) return false;
    try {
      writeFunnelRecord(this.deps.recordPath(), {
        pid: this.pid,
        lstart: facts.lstart,
        command: facts.command,
        argv: this.argv,
        at: this.deps.now()
      });
      return true;
    } catch {
      log.warn('could not record the Funnel child');
      return false;
    }
  }

  private async exitWithin(ms: number): Promise<boolean> {
    if (this.exitInfo !== null) return true;
    const won = await Promise.race([
      this.exited.then(() => true),
      this.deps.sleep(ms).then(() => false)
    ]);
    return won || this.exitInfo !== null;
  }

  private signal(sig: NodeJS.Signals): void {
    try {
      this.child.kill(sig);
    } catch {
      /* already gone */
    }
  }

  /**
   * STOP: SIGINT, the child's documented exit, which makes tailscaled delete
   * the foreground session; then SIGTERM; then SIGKILL, IN A `finally`, so no
   * path out of this method leaves the child running. A SIGKILLed CLI still
   * ends its session: its bus watch closes and tailscaled's deferred delete
   * runs. The record is deleted after an end. Calling it twice is calling it
   * once. It never throws.
   */
  stop(): Promise<boolean> {
    this.stopRequested = true;
    if (this.stopping !== null) return this.stopping;
    this.stopping = (async () => {
      let ended = this.exitInfo !== null;
      try {
        if (!ended) {
          this.signal('SIGINT');
          ended = await this.exitWithin(FUNNEL_STOP_INT_MS);
        }
        if (!ended) {
          this.signal('SIGTERM');
          ended = await this.exitWithin(FUNNEL_STOP_TERM_MS);
        }
      } finally {
        if (!ended) {
          this.signal('SIGKILL');
          ended = await this.exitWithin(FUNNEL_STOP_KILL_MS);
        }
      }
      if (ended) {
        live.delete(this);
        deleteRecord(this.deps.recordPath(), this.pid);
      }
      return ended;
    })();
    return this.stopping;
  }
}

// ---------------------------------------------------------------------------
// The start
// ---------------------------------------------------------------------------

export interface FunnelStartInput {
  readonly program: string;
  readonly publicName: string;
  readonly publicPort: number;
  /** The door process's reported port. Never a setting. */
  readonly localPort: number;
}

export type FunnelStartOutcome =
  | { readonly kind: 'published'; readonly run: FunnelRun }
  | { readonly kind: 'refused'; readonly reason: PocketFunnelRefusal }
  /** A later press, or the quit, arrived first. The child was stopped. */
  | { readonly kind: 'superseded' };

export interface FunnelStartEvents {
  /** Tailscale printed an approval URL and the start now waits on it. */
  onApproval?(url: string, opens: boolean): void;
  /** The approval landed (`Success.`), and the start carries on. */
  onApproved?(): void;
}

type Settle =
  | { k: 'exit'; exit: FunnelExit }
  | { k: 'available' }
  | { k: 'deadline' }
  | { k: 'approval-timeout' }
  | { k: 'superseded' };

/**
 * Start the Funnel child and answer when it is published, refused, or no
 * longer wanted. EVERY PATH BUT A COUNTED START STOPS THE CHILD IN A
 * `finally`. The approval wait lives here, bounded at ten minutes and raced
 * against `superseded`, so a later press ends it at once.
 */
export async function startFunnel(
  deps: FunnelDeps,
  input: FunnelStartInput,
  superseded: Promise<void>,
  events: FunnelStartEvents = {}
): Promise<FunnelStartOutcome> {
  if (quitting) return { kind: 'superseded' };
  const argv = funnelArgv(input.publicPort, input.localPort);
  let child: FunnelChild;
  try {
    child = deps.spawn(input.program, argv);
  } catch {
    log.warn('the Funnel child did not start: failed');
    return { kind: 'refused', reason: 'failed' };
  }
  const run = new FunnelRun(child, deps, [input.program, ...argv]);
  let published = false;
  try {
    await run.record();
    const outcome = await awaitStart(deps, run, input, superseded, events);
    if (outcome.kind === 'published') {
      // THE COUNTED START IS RECORDED AGAIN: by now the child has printed
      // `Available on the internet:`, so what `ps` prints is its final image.
      await run.record();
      published = true;
    }
    if (outcome.kind === 'refused') log.warn(`the Funnel child did not publish: ${outcome.reason}`);
    return outcome;
  } finally {
    if (!published) await run.stop();
  }
}

async function awaitStart(
  deps: FunnelDeps,
  run: FunnelRun,
  input: FunnelStartInput,
  superseded: Promise<void>,
  events: FunnelStartEvents
): Promise<FunnelStartOutcome> {
  let urlSeen: string | null = null;
  let available = false;
  let wake: ((s: Settle) => void) | null = null;
  const queue: Settle[] = [];
  const settle = (s: Settle): void => {
    if (wake !== null) {
      const w = wake;
      wake = null;
      w(s);
    } else {
      queue.push(s);
    }
  };
  const next = (): Promise<Settle> =>
    queue.length > 0
      ? Promise.resolve(queue.shift() as Settle)
      : new Promise((resolve) => {
          wake = resolve;
        });

  // The deadline, re-armed by generation: an approval pauses it, and the
  // approval's own wait takes its place until `Success.` re-arms it.
  let generation = 0;
  const arm = (ms: number, what: 'deadline' | 'approval-timeout'): void => {
    const mine = ++generation;
    void deps.sleep(ms).then(() => {
      if (mine === generation) settle({ k: what });
    });
  };
  arm(FUNNEL_START_DEADLINE_MS, 'deadline');

  run.onLine((stream, line) => {
    if (stream !== 'out' && !line.includes(MSG_FUNNEL_AVAILABLE)) return;
    if (!available && urlSeen === null && stream === 'out') {
      const url = approvalUrlOf(line);
      if (url !== null) {
        urlSeen = url;
        arm(FUNNEL_APPROVAL_WAIT_MS, 'approval-timeout');
        events.onApproval?.(url, approvalOpens(url));
        return;
      }
    }
    if (stream === 'out' && line.trim() === MSG_SUCCESS && urlSeen !== null) {
      arm(FUNNEL_START_DEADLINE_MS, 'deadline');
      events.onApproved?.();
      return;
    }
    if (!available && line.includes(MSG_FUNNEL_AVAILABLE)) {
      available = true;
      settle({ k: 'available' });
    }
  });
  void run.whenExited().then((exit) => settle({ k: 'exit', exit }));
  void superseded.then(() => settle({ k: 'superseded' }));
  void quitSignal.then(() => settle({ k: 'superseded' }));

  for (;;) {
    const s = await next();
    switch (s.k) {
      case 'superseded':
        generation += 1;
        return { kind: 'superseded' };
      case 'deadline':
        return { kind: 'refused', reason: 'failed' };
      case 'approval-timeout':
        return { kind: 'refused', reason: 'approval-timeout' };
      case 'exit':
        generation += 1;
        return {
          kind: 'refused',
          reason: classifyFunnelExit({
            stderr: run.err.text(),
            code: s.exit.code,
            urlSeen: urlSeen !== null
          })
        };
      case 'available': {
        for (let i = 0; i < FUNNEL_READBACK_TRIES; i += 1) {
          if (i > 0) await deps.sleep(FUNNEL_READBACK_GAP_MS);
          if (!run.alive || quitting) break;
          const served = await readServe(deps, input.program);
          if (served !== undefined && servesThisDoor(served, input)) {
            generation += 1;
            return { kind: 'published', run };
          }
        }
        // The child said it was available and the config does not say so.
        // A later exit or the deadline is not waited for: this is not a start.
        generation += 1;
        if (!run.alive && run.exit !== null) {
          return {
            kind: 'refused',
            reason: classifyFunnelExit({ stderr: run.err.text(), code: run.exit.code, urlSeen: urlSeen !== null })
          };
        }
        return { kind: 'refused', reason: 'failed' };
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The restart's spacing, and the quit
// ---------------------------------------------------------------------------

/** The next restart's spacing after `previous` (0 for the first). */
export function nextRestartDelay(previous: number): number {
  if (previous <= 0) return FUNNEL_RESTART_FLOOR_MS;
  return Math.min(previous * 2, FUNNEL_RESTART_CAP_MS);
}

/**
 * Arm a restart `ms` from now. Answers the cancel. Every timer is cleared by
 * {@link beginFunnelShutdown}, and none fires once the quit has begun.
 */
export function armFunnelRestart(deps: FunnelDeps, ms: number, fire: () => void): () => void {
  let cancelled = false;
  const cancel = (): void => {
    cancelled = true;
    restartTimers.delete(cancel);
  };
  // Nothing is armed once the quit has begun: its first line cleared every
  // timer, and a timer armed after it would outlive the one place that clears.
  if (quitting) return cancel;
  restartTimers.add(cancel);
  void deps.sleep(ms).then(() => {
    if (cancelled) return;
    restartTimers.delete(cancel);
    fire();
  });
  return cancel;
}

/**
 * The quit's first line, synchronously: no new start, every restart timer
 * cleared, and a start waiting on an approval stops waiting. It ends nothing:
 * {@link joinFunnel} does. Calling it twice is calling it once.
 */
export function beginFunnelShutdown(): void {
  quitting = true;
  quitNow();
  for (const cancel of [...restartTimers]) cancel();
}

/** True from the first line of {@link beginFunnelShutdown}. */
export function funnelShutdownStarted(): boolean {
  return quitting;
}

export interface FunnelJoinReport {
  readonly children: number;
  readonly ended: number;
  readonly waitedMs: number;
}

/**
 * The quit's bounded join: every child this process holds is stopped —
 * SIGINT, SIGTERM, SIGKILL — within {@link FUNNEL_JOIN_MS} and a little, and
 * its record is deleted after it ended. UNPUBLISHING COMES BEFORE THE
 * LISTENER: `capabilities.ts` awaits this before `joinPocketDoor()`. It never
 * throws.
 */
export async function joinFunnel(): Promise<FunnelJoinReport> {
  const startedAt = Date.now();
  beginFunnelShutdown();
  const runs = [...live];
  if (runs.length === 0) return { children: 0, ended: 0, waitedMs: 0 };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const bound = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), FUNNEL_JOIN_MS + FUNNEL_STOP_KILL_MS + 250);
    timer.unref?.();
  });
  try {
    const stopped = await Promise.race([Promise.all(runs.map((run) => run.stop().catch(() => false))), bound]);
    const ended = stopped === null ? runs.filter((run) => !run.alive).length : stopped.filter(Boolean).length;
    return { children: runs.length, ended, waitedMs: Date.now() - startedAt };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Tests only: forget the module's quit and every child it holds. */
export function resetFunnelForTests(): void {
  quitting = false;
  live.clear();
  for (const cancel of [...restartTimers]) cancel();
  quitSignal = new Promise((resolve) => {
    quitNow = resolve;
  });
}

/** Tests only: how many children this process holds. */
export function liveFunnelCountForTests(): number {
  return live.size;
}
