#!/usr/bin/env node
/**
 * build/p330/tailscale-standin.mjs — a program that answers the three
 * Tailscale commands Tortie is allowed to run, and nothing else (Phase 330,
 * build/p330/SPEC.md §6.3). IT IS NOT TAILSCALE.
 *
 * WHY IT EXISTS. From Phase 330 the door is published by the Mac's own
 * Tailscale program, run by Tortie as a foreground child:
 *
 *   <program> funnel --tcp=<publicPort> --proxy-protocol=2 tcp://127.0.0.1:<localPort>
 *
 * No agent may run that against his tailnet, and none may call the LocalAPI.
 * So every test, probe and gate that drives Funnel drives THIS FILE instead, at
 * an injected path (`GMUX_TAILSCALE_BIN`, which a development build honours and
 * a packaged one ignores). What it answers is shaped by the pinned source
 * research 132 read (`tailscale.com v1.94.1`) and by his measurement of
 * 2026-09-29 on Standalone 1.102.2; the `file:line`s below are into that copy.
 *
 * ITS SURFACE, and every other argv is REFUSED with exit 2 and a line in its log:
 *
 *   status --json [--peers=false]
 *       `ipnstate.Status` as `json.MarshalIndent(st, "", "  ")` prints it
 *       (cmd/tailscale/cli/status.go:97, ipn/ipnstate/ipnstate.go:36-80 and
 *       :286-352): `BackendState`, `Self` with a `DNSName` ending in a dot and
 *       a `CapMap` holding `https`, `funnel` and the `funnel-ports` URL key,
 *       `CurrentTailnet {Name, MagicDNSSuffix, MagicDNSEnabled}`, `Peer: null`.
 *   serve status --json
 *       `null`, or an `ipn.ServeConfig` (ipn/serve.go:51-81) whose
 *       `Foreground[<session id>]` holds `TCP["<p>"] = {TCPForward,
 *       ProxyProtocol: 2}` and `AllowFunnel["<name>:<p>"] = true` for every
 *       funnel of this stand-in that is still alive (serve_legacy.go:616-628).
 *   funnel --tcp=<p> --proxy-protocol=2 tcp://127.0.0.1:<q>
 *       Exactly this shape. It prints the CLI's lines (serve_v2.go:950 and
 *       :1055-1063, `Available on the internet:` then the tcp lines, then
 *       `Press Ctrl+C to exit.`), listens on 127.0.0.1:0 as THE FORWARDER, and
 *       on each connection dials 127.0.0.1:<q>, writes a PROXY v2 TCP4 header
 *       (ipn/ipnlocal/serve.go:710-765: the client's address as the source,
 *       the node's address and the backend's port as the destination) and the
 *       client's first bytes in ONE write, then pipes both ways. It exits 0 on
 *       SIGINT (serve_v2.go:395), removing its entry, which is what tailscaled
 *       does with a foreground session whose bus watch closed.
 *
 * `--bg`, `reset`, `off`, `clear`, `--https`, `--http`, `--tls-terminated-tcp`,
 * `--set-path`, `--yes`, `--service` and any `serve` but `serve status --json`
 * are refused AND RECORDED as forbidden, so a probe fails on sight.
 *
 * ITS SCENARIOS come from `<dir>/scenario.json`, which a probe rewrites between
 * arms (`setScenario`):
 *
 *   backendState       'Running' (default), 'Stopped', 'NeedsLogin', 'NeedsMachineAuth'
 *   signedOut          true: no `CurrentTailnet` (and NeedsLogin unless set)
 *   tailnet, dnsName   the tailnet's name and the node's DNS name (with its dot;
 *                      '' is a node with no name)
 *   caps               false: `https` and `funnel` are not in the CapMap until
 *                      `<dir>/approve` exists (the approval page's one click)
 *   funnelPorts        the ports the funnel-ports key names; null leaves it out
 *   approval           'wait' (default when caps is false): a made-up text and
 *                      `https://login.tailscale.com/f/funnel?node=nMADEUP` after
 *                      nine spaces (serve_legacy.go:814-818), then it waits for
 *                      `<dir>/approve` and prints `Success.` (:863);
 *                      'exit0': the same lines, then exit 0 (:820-826)
 *   refuse             'shields-up' | 'ports443' | 'port-taken' | 'busy' |
 *                      'not-approved' | 'failed': the pinned message on stderr,
 *                      exit 1 (SPEC §4.2.5's table)
 *   unreadable         'status' | 'serve': that read prints something that is not JSON
 *   tailnetAfterReads  {n, name, dnsName?}: after n `status` reads have been
 *                      answered, the tailnet (and optionally the name) moves.
 *                      The profile-switch arm
 *   servedPorts        ports someone else serves in the background (`TCP`)
 *   servedWeb          ports someone else serves as web (`Web["<name>:<p>"]`)
 *   proxySource        the PROXY header's source, default 203.0.113.7 (the
 *                      documentation range); proxy: false sends no header
 *   coalesce           false: the header and the first client bytes are two writes
 *
 * THE DECOY. With `P330_STANDIN_ROLE=decoy` in its environment, `funnel` prints
 * the same lines and holds no forwarder and no entry: a process whose command
 * line is byte for byte a real child's, which the orphan arm starts between two
 * launches. `ps -o command=` does not show the environment, so the two cannot be
 * told apart by their command line, which is the point.
 *
 * HOW IT IS RUN. Through a `/bin/sh` wrapper `makeStandin()` writes, with the
 * state directory baked in: `exec <node> <this file> "$@"`. It never calls any
 * real `tailscale`, never opens a non-loopback socket, and writes only under
 * its directory. Its log (`<dir>/invocations.log`, JSON lines) holds every
 * invocation, its verdict, and every exit with its signal.
 *
 * FOR THE PROBES it exports `makeStandin({ dir, scenario })`, the preflight
 * every probe runs before it launches (`preflightStandin`), the sampler that
 * fails a run on any real Tailscale process under it (`realTailscaleIn`,
 * `watchForRealTailscale`), and `endStandinProcesses`, which ends every
 * stand-in pid a run left, by pid, in its `finally`.
 *
 *   node build/p330/tailscale-standin.mjs --self-test
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  accessSync,
  appendFileSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { connect as netConnect, createServer as createNetServer, isIPv4 } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const TAG = '[p330 tailscale stand-in]';
const J = JSON.stringify;

/** The state directory, baked into the wrapper. */
export const STANDIN_DIR_ENV = 'P330_STANDIN_DIR';
/** `decoy`: the orphan arm's process with a real child's command line. */
export const STANDIN_ROLE_ENV = 'P330_STANDIN_ROLE';
/** The canonical stand-in, whose bytes every preflight compares against. */
export const STANDIN_PATH = join(ROOT, 'build', 'p330', 'tailscale-standin.mjs');
/** The approval URL it prints. MADE UP: the real page's host was not recorded (SPEC §2.2 O3). */
export const MADE_UP_APPROVAL_URL = 'https://login.tailscale.com/f/funnel?node=nMADEUP';
/** The node's tailnet addresses in the PROXY header and the tcp lines. Made up. */
const SELF_V4 = '100.64.0.7';
const SELF_V6 = 'fd7a:115c:a1e0::7';

/** The default world: a node with a name, Funnel approved, nothing served. */
export const DEFAULT_SCENARIO = Object.freeze({
  backendState: 'Running',
  signedOut: false,
  tailnet: 'standin@example.com',
  dnsName: 'p330-mac.tail00000.ts.net.',
  caps: true,
  funnelPorts: [443, 8443, 10000],
  approval: null,
  refuse: null,
  unreadable: null,
  tailnetAfterReads: null,
  servedPorts: [],
  servedWeb: [],
  proxySource: '203.0.113.7',
  proxy: true,
  coalesce: true
});

/**
 * The pinned messages, by the refusal Tortie classifies them as (SPEC
 * §4.2.5). `P` is the public port. Each is what cmd/tailscale's main prints
 * with `fmt.Fprintln(os.Stderr, err)` (cmd/tailscale/tailscale.go:22-24), with
 * the LocalAPI client's own prefix where the error came through it
 * (client/local/serve.go:52).
 */
export const PINNED_REFUSALS = Object.freeze({
  // ipn/ipnlocal/serve.go:329-331
  'shields-up': () => 'sending serve config: Unable to turn on Funnel while shields-up is enabled',
  // ipn/serve.go:612-628 (CheckFunnelPort)
  ports443: (p) => `port ${String(p)} is not allowed for funnel; allowed ports are: 443`,
  // ipn/ipnlocal/serve.go:1686
  'port-taken': (p) => `sending serve config: listener already exists for port ${String(p)}`,
  // serve_v2.go:536-537, then the returned precondition error
  busy: () => 'Another client is changing the serve config; please try again.\nsending serve config: precondition failed',
  // ipn/serve.go:614-615 (NodeCanFunnel)
  'not-approved': () => 'Funnel not available; "funnel" node attribute not set. See https://tailscale.com/s/no-funnel.',
  failed: () => 'error: the p330 stand-in was told to fail this start for no reason Tortie names'
});

/** The words that make an argv forbidden anywhere (SPEC §4.2.4). */
const FORBIDDEN_FLAGS = ['--bg', '--https', '--http', '--tls-terminated-tcp', '--set-path', '--yes', '--service'];
const FORBIDDEN_WORDS = ['reset', 'off', 'clear'];

// ---------------------------------------------------------------------------
// The argv, read
// ---------------------------------------------------------------------------

/**
 * What an argv is: one of the three answered shapes, or refused, with whether
 * it is FORBIDDEN (a flag or subcommand Tortie must never pass). Pure.
 */
export function classifyArgv(argv) {
  const a = Array.isArray(argv) ? argv.map(String) : [];
  const forbidden =
    a.some((x) => FORBIDDEN_FLAGS.some((f) => x === f || x.startsWith(`${f}=`))) ||
    a.some((x) => FORBIDDEN_WORDS.includes(x)) ||
    (a[0] === 'serve' && !(a.length === 3 && a[1] === 'status' && a[2] === '--json'));
  if (a[0] === 'status') {
    const rest = a.slice(1);
    const ok = rest.includes('--json') && rest.every((x) => x === '--json' || x === '--peers=false') && new Set(rest).size === rest.length;
    if (ok) return { kind: 'status', peers: !rest.includes('--peers=false'), forbidden };
  }
  if (a.length === 3 && a[0] === 'serve' && a[1] === 'status' && a[2] === '--json') return { kind: 'serve-status', forbidden };
  if (a[0] === 'funnel' && a.length === 4) {
    const tcp = /^--tcp=([1-9][0-9]{0,4})$/.exec(a[1]);
    const target = /^tcp:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})$/.exec(a[3]);
    const publicPort = tcp === null ? NaN : Number(tcp[1]);
    const localPort = target === null ? NaN : Number(target[1]);
    if (a[2] === '--proxy-protocol=2' && publicPort <= 65535 && localPort <= 65535 && !forbidden) {
      return { kind: 'funnel', publicPort, localPort, forbidden: false };
    }
  }
  return { kind: 'refused', forbidden };
}

// ---------------------------------------------------------------------------
// State under <dir>
// ---------------------------------------------------------------------------

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

/** Write through a temporary name, so a reader never sees half a file. */
function writeJsonAtomic(path, value) {
  const tmp = `${path}.${String(process.pid)}.${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(tmp, `${J(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(tmp, path);
}

function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code === 'EPERM';
  }
}

export function scenarioOf(dir) {
  return { ...DEFAULT_SCENARIO, ...readJson(join(dir, 'scenario.json'), {}) };
}

function logLine(dir, entry) {
  try {
    appendFileSync(join(dir, 'invocations.log'), `${J({ at: Date.now(), pid: process.pid, ppid: process.ppid, ...entry })}\n`, { mode: 0o600 });
  } catch {
    /* a missing directory is the probe's own teardown; nothing to record into */
  }
}

/** Every line of the log, parsed. */
export function readLogOf(dir) {
  let text = '';
  try {
    text = readFileSync(join(dir, 'invocations.log'), 'utf8');
  } catch {
    return [];
  }
  return text
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return { unparsable: l };
      }
    });
}

const FUNNELS = 'funnel.d';

/**
 * Every funnel entry whose process is still alive. One file per pid, because
 * two funnels writing one file would race; `funnel.json` beside them is the
 * aggregate, rewritten after every change, for a person reading the directory.
 * A dead pid's entry is ignored, which is what tailscaled does with a
 * foreground session whose bus watch closed (a SIGKILLed CLI included).
 */
export function readFunnelOf(dir) {
  const out = [];
  let names = [];
  try {
    names = readdirSync(join(dir, FUNNELS));
  } catch {
    return out;
  }
  for (const name of names) {
    if (!/^[0-9]+\.json$/.test(name)) continue;
    const entry = readJson(join(dir, FUNNELS, name), null);
    if (entry !== null && isAlive(entry.pid)) out.push(entry);
  }
  return out.sort((a, b) => a.at - b.at);
}

function writeAggregate(dir) {
  try {
    writeJsonAtomic(join(dir, 'funnel.json'), { entries: readFunnelOf(dir) });
  } catch {
    /* the aggregate is a convenience; the per-pid files are the truth */
  }
}

// ---------------------------------------------------------------------------
// The two reads
// ---------------------------------------------------------------------------

function answeredStatusReads(dir) {
  return readLogOf(dir).filter((e) => e.kind === 'status' && e.verdict === 'answered').length;
}

/** `ipnstate.Status` for this scenario, as `status --json` prints it. */
export function statusOf(scenario, { statusReadsBefore = 0, approved = false } = {}) {
  let tailnet = scenario.tailnet;
  let dnsName = scenario.dnsName;
  const moved = scenario.tailnetAfterReads;
  if (moved !== null && typeof moved === 'object' && statusReadsBefore >= Number(moved.n ?? 0)) {
    tailnet = String(moved.name ?? tailnet);
    if (typeof moved.dnsName === 'string') dnsName = moved.dnsName;
  }
  const suffix = dnsName.replace(/\.$/, '').split('.').slice(1).join('.');
  const capMap = {};
  if (scenario.caps !== false || approved) {
    capMap.https = null;
    capMap.funnel = null;
  }
  if (Array.isArray(scenario.funnelPorts)) capMap[`https://tailscale.com/cap/funnel-ports?ports=${scenario.funnelPorts.join(',')}`] = null;
  const signedOut = scenario.signedOut === true;
  const backend = signedOut && scenario.backendState === 'Running' ? 'NeedsLogin' : scenario.backendState;
  const zero = '0001-01-01T00:00:00Z';
  return {
    Version: '1.94.1-p330-standin',
    TUN: false,
    BackendState: backend,
    HaveNodeKey: true,
    AuthURL: '',
    TailscaleIPs: [SELF_V4, SELF_V6],
    Self: {
      ID: 'nP330STANDIN',
      PublicKey: `nodekey:${'0'.repeat(64)}`,
      HostName: 'p330-mac',
      DNSName: dnsName,
      OS: 'macOS',
      UserID: 1,
      TailscaleIPs: [SELF_V4, SELF_V6],
      Addrs: null,
      CurAddr: '',
      Relay: '',
      PeerRelay: '',
      RxBytes: 0,
      TxBytes: 0,
      Created: zero,
      LastWrite: zero,
      LastSeen: zero,
      LastHandshake: zero,
      Online: backend === 'Running',
      ExitNode: false,
      ExitNodeOption: false,
      Active: false,
      PeerAPIURL: null,
      TaildropTarget: 0,
      NoFileSharingReason: '',
      Capabilities: Object.keys(capMap),
      CapMap: capMap,
      InNetworkMap: true,
      InMagicSock: false,
      InEngine: false
    },
    Health: [],
    MagicDNSSuffix: signedOut ? '' : suffix,
    CurrentTailnet: signedOut ? null : { Name: tailnet, MagicDNSSuffix: suffix, MagicDNSEnabled: dnsName !== '' },
    CertDomains: dnsName === '' ? null : [dnsName.replace(/\.$/, '')],
    Peer: null,
    User: null,
    ClientVersion: null
  };
}

/** `ipn.ServeConfig` for this directory, or null when nothing is served. */
export function serveConfigOf(scenario, funnels) {
  const sc = {};
  const name = scenario.dnsName.replace(/\.$/, '');
  for (const p of scenario.servedPorts ?? []) {
    sc.TCP ??= {};
    sc.TCP[String(p)] = { TCPForward: '127.0.0.1:1' };
  }
  for (const p of scenario.servedWeb ?? []) {
    sc.Web ??= {};
    sc.Web[`${name}:${String(p)}`] = { Handlers: { '/': { Proxy: 'http://127.0.0.1:1' } } };
  }
  for (const f of funnels) {
    sc.Foreground ??= {};
    sc.Foreground[f.sid] = {
      TCP: { [String(f.publicPort)]: { TCPForward: `127.0.0.1:${String(f.localPort)}`, ProxyProtocol: 2 } },
      AllowFunnel: { [`${f.name}:${String(f.publicPort)}`]: true }
    };
  }
  return Object.keys(sc).length === 0 ? null : sc;
}

// ---------------------------------------------------------------------------
// PROXY v2, the way go-proxyproto formats it (ipn/ipnlocal/serve.go:710-765)
// ---------------------------------------------------------------------------

export const PROXY_V2_SIGNATURE = Buffer.from([0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d, 0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a]);

/** A PROXY v2 PROXY/TCP4 header with no TLVs. */
export function proxyV2Tcp4(srcIp, srcPort, dstIp, dstPort) {
  if (!isIPv4(srcIp) || !isIPv4(dstIp)) throw new Error('proxyV2Tcp4 takes two IPv4 addresses');
  const out = Buffer.alloc(28);
  PROXY_V2_SIGNATURE.copy(out, 0);
  out[12] = 0x21; // version 2, PROXY
  out[13] = 0x11; // AF_INET, STREAM
  out.writeUInt16BE(12, 14);
  srcIp.split('.').forEach((o, i) => (out[16 + i] = Number(o)));
  dstIp.split('.').forEach((o, i) => (out[20 + i] = Number(o)));
  out.writeUInt16BE(srcPort & 0xffff, 24);
  out.writeUInt16BE(dstPort & 0xffff, 26);
  return out;
}

/** Read a PROXY v2 TCP4 header off the front of a buffer, or null. For tests. */
export function parseProxyV2Tcp4(buf) {
  if (buf.length < 28 || !buf.subarray(0, 12).equals(PROXY_V2_SIGNATURE) || buf[12] !== 0x21 || buf[13] !== 0x11) return null;
  const len = buf.readUInt16BE(14);
  if (len < 12 || buf.length < 16 + len) return null;
  return {
    source: [...buf.subarray(16, 20)].join('.'),
    dest: [...buf.subarray(20, 24)].join('.'),
    sourcePort: buf.readUInt16BE(24),
    destPort: buf.readUInt16BE(26),
    length: 16 + len,
    rest: buf.subarray(16 + len)
  };
}

// ---------------------------------------------------------------------------
// The program
// ---------------------------------------------------------------------------

function out(text) {
  process.stdout.write(text);
}

function refuseArgv(dir, argv, classified, why) {
  logLine(dir, { kind: 'refused', argv, verdict: 'refused', forbidden: classified.forbidden, why });
  process.stderr.write(`${TAG} refused: ${why}. This program answers \`status --json [--peers=false]\`, \`serve status --json\` and \`funnel --tcp=P --proxy-protocol=2 tcp://127.0.0.1:Q\` and nothing else.\n`);
  process.exitCode = 2;
}

function runStatus(dir, argv, classified) {
  const scenario = scenarioOf(dir);
  const before = answeredStatusReads(dir);
  logLine(dir, { kind: 'status', argv, verdict: 'answered', peers: classified.peers });
  if (scenario.unreadable === 'status') {
    out('{"BackendState": "Running", "Self": {\n');
    return;
  }
  out(`${J(statusOf(scenario, { statusReadsBefore: before, approved: existsSync(join(dir, 'approve')) }), null, 2)}\n`);
}

function runServeStatus(dir, argv) {
  const scenario = scenarioOf(dir);
  logLine(dir, { kind: 'serve-status', argv, verdict: 'answered' });
  if (scenario.unreadable === 'serve') {
    out('{"TCP": {"8443": \n');
    return;
  }
  out(`${J(serveConfigOf(scenario, readFunnelOf(dir)), null, 2)}\n`);
}

/** The lines `messageForPort` builds for a TCP forward (serve_v2.go:1017-1063). */
export function availableLines(name, publicPort, localPort) {
  return [
    'Available on the internet:',
    '',
    `|-- tcp://${name}:${String(publicPort)} (TLS over TCP, PROXY protocol v2)`,
    `|-- tcp://${SELF_V4}:${String(publicPort)}`,
    `|-- tcp://[${SELF_V6}]:${String(publicPort)}`,
    `|--> tcp://127.0.0.1:${String(localPort)}`,
    '',
    'Press Ctrl+C to exit.'
  ].join('\n');
}

async function runFunnel(dir, argv, classified) {
  const role = process.env[STANDIN_ROLE_ENV] === 'decoy' ? 'decoy' : 'child';
  const scenario = scenarioOf(dir);
  const { publicPort, localPort } = classified;
  const name = scenario.dnsName.replace(/\.$/, '');
  logLine(dir, { kind: 'funnel', argv, verdict: 'answered', role, publicPort, localPort });

  let ending = false;
  let server = null;
  const sockets = new Set();
  const entryPath = join(dir, FUNNELS, `${String(process.pid)}.json`);
  const end = (how) => {
    if (ending) return;
    ending = true;
    try {
      unlinkSync(entryPath);
    } catch {
      /* no entry, a refusal or the decoy */
    }
    writeAggregate(dir);
    for (const s of sockets) s.destroy();
    logLine(dir, { kind: 'exit', event: 'exit', role, how });
    if (how === 'SIGTERM' || how === 'SIGHUP') {
      // The real CLI does not catch these (signal.NotifyContext takes
      // os.Interrupt alone), so it dies BY the signal, and so does this.
      process.removeAllListeners(how);
      server?.close();
      process.kill(process.pid, how);
      return;
    }
    server?.close();
    process.exit(0);
  };
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => end(signal));

  if (role === 'decoy') {
    out(`${availableLines(name, publicPort, localPort)}\n`);
    setInterval(() => undefined, 1 << 30);
    return;
  }

  // verifyFunnelEnabled (funnel.go:139-162) and enableFeatureInteractive
  // (serve_legacy.go:787-866): no capability means the approval page.
  const approvedNow = () => scenario.caps !== false || existsSync(join(dir, 'approve'));
  if (!approvedNow()) {
    out('\nFunnel is not enabled on your tailnet. THIS TEXT IS MADE UP by the p330 stand-in; the real wording was not recorded.\n');
    out(`\n         ${MADE_UP_APPROVAL_URL}\n\n`);
    if ((scenario.approval ?? 'wait') === 'exit0') {
      logLine(dir, { kind: 'exit', event: 'exit', role, how: 'approval-exit0' });
      process.exit(0);
    }
    await new Promise((done) => {
      const poll = setInterval(() => {
        if (!existsSync(join(dir, 'approve'))) return;
        clearInterval(poll);
        done();
      }, 100);
    });
    out('Success.\n');
  }

  if (typeof scenario.refuse === 'string') {
    const message = PINNED_REFUSALS[scenario.refuse] ?? PINNED_REFUSALS.failed;
    process.stderr.write(`${message(publicPort)}\n`);
    logLine(dir, { kind: 'exit', event: 'exit', role, how: `refused-${scenario.refuse}`, code: 1 });
    process.exit(1);
  }

  // tailscaled's own refusal (ipn/ipnlocal/serve.go:1680-1690): a new
  // foreground session may not take a port another session or the background
  // config already holds.
  const held = new Set([...(scenario.servedPorts ?? []), ...(scenario.servedWeb ?? []), ...readFunnelOf(dir).map((f) => f.publicPort)]);
  if (held.has(publicPort)) {
    process.stderr.write(`${PINNED_REFUSALS['port-taken'](publicPort)}\n`);
    logLine(dir, { kind: 'exit', event: 'exit', role, how: 'refused-held', code: 1 });
    process.exit(1);
  }

  server = createNetServer((client) => {
    sockets.add(client);
    client.on('close', () => sockets.delete(client));
    client.on('error', () => undefined);
    // The client's bytes are queued until the backend answers, then written
    // after the header; once `ready`, they go straight through, in order.
    const queued = [];
    let ready = false;
    const upstream = netConnect({ host: '127.0.0.1', port: localPort });
    client.on('data', (chunk) => {
      if (ready) upstream.write(chunk);
      else queued.push(chunk);
    });
    client.on('end', () => upstream.end());
    upstream.once('connect', () => {
      const current = scenarioOf(dir);
      const header = current.proxy === false ? Buffer.alloc(0) : proxyV2Tcp4(String(current.proxySource ?? '203.0.113.7'), client.remotePort ?? 0, SELF_V4, upstream.remotePort ?? localPort);
      const drain = () => {
        if (queued.length > 0) upstream.write(Buffer.concat(queued.splice(0)));
        ready = true;
      };
      const go = () => {
        if (current.coalesce === false) {
          // Two writes: the header, then the client's bytes 20 ms later.
          if (header.length > 0) upstream.write(header);
          setTimeout(drain, 20);
        } else {
          // ONE write, the header and the ClientHello together: the coalesced
          // case the listener must hand to TLS whole (SPEC §4.6 step 3, §10
          // concern 1), which a real relay produces whenever both are ready.
          upstream.write(Buffer.concat([header, ...queued.splice(0)]));
          ready = true;
        }
      };
      // The client's first segment usually arrives in the same moment as the
      // backend's accept; wait for it briefly so it rides with the header.
      if (queued.length === 0 && current.coalesce !== false) setTimeout(go, 30);
      else go();
      upstream.pipe(client);
    });
    sockets.add(upstream);
    upstream.on('close', () => {
      sockets.delete(upstream);
      client.destroy();
    });
    upstream.on('error', () => client.destroy());
    client.on('close', () => upstream.destroy());
  });
  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => ok());
  });
  const forwarderPort = server.address().port;
  mkdirSync(join(dir, FUNNELS), { recursive: true, mode: 0o700 });
  writeJsonAtomic(entryPath, {
    pid: process.pid,
    sid: `p330-${randomBytes(6).toString('hex')}`,
    name,
    tailnet: scenario.tailnet,
    publicPort,
    localPort,
    forwarderPort,
    at: Date.now()
  });
  writeAggregate(dir);
  out(`${availableLines(name, publicPort, localPort)}\n`);
  // The CLI blocks on its bus watch until SIGINT; so does this.
  setInterval(() => undefined, 1 << 30);
}

async function program() {
  const dir = process.env[STANDIN_DIR_ENV] ?? '';
  const argv = process.argv.slice(2);
  if (dir === '' || !existsSync(dir)) {
    process.stderr.write(`${TAG} refused: ${STANDIN_DIR_ENV} names no directory, so there is nowhere to read a scenario or record this call. Run it through the wrapper makeStandin() writes.\n`);
    process.exit(2);
  }
  const classified = classifyArgv(argv);
  if (classified.kind === 'status') return runStatus(dir, argv, classified);
  if (classified.kind === 'serve-status') return runServeStatus(dir, argv);
  if (classified.kind === 'funnel') return runFunnel(dir, argv, classified);
  return refuseArgv(dir, argv, classified, classified.forbidden ? `FORBIDDEN argv ${J(argv)}` : `unknown argv ${J(argv)}`);
}

// ---------------------------------------------------------------------------
// For the probes
// ---------------------------------------------------------------------------

export const sha256File = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

/** The wrapper's text: a /bin/sh that execs this file with the directory baked in. */
export function wrapperText(dir, node = process.execPath, target = STANDIN_PATH) {
  const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  return [
    '#!/bin/sh',
    '# NOT TAILSCALE. Phase 330\'s stand-in (build/p330/tailscale-standin.mjs),',
    '# written by a probe into its own scratch directory. It answers status,',
    '# serve status and one funnel shape, and refuses everything else.',
    `${STANDIN_DIR_ENV}=${q(dir)}`,
    `export ${STANDIN_DIR_ENV}`,
    `exec ${q(node)} ${q(target)} "$@"`,
    ''
  ].join('\n');
}

/**
 * Make a stand-in in `dir` (created 0700, outside any Electron profile so the
 * helper's profile sweep never mistakes its children for the app's). Returns
 * its wrapper path and the readers and writers a probe needs.
 */
export function makeStandin({ dir, scenario = {}, node = process.execPath }) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  mkdirSync(join(dir, FUNNELS), { recursive: true, mode: 0o700 });
  const binPath = join(dir, 'tailscale');
  writeFileSync(binPath, wrapperText(dir, node), { mode: 0o755 });
  const wrapperSha256 = sha256File(binPath);
  const targetSha256 = sha256File(STANDIN_PATH);
  const setScenario = (next, { merge = true } = {}) => writeJsonAtomic(join(dir, 'scenario.json'), merge ? { ...readJson(join(dir, 'scenario.json'), {}), ...next } : next);
  setScenario(scenario, { merge: false });
  return {
    dir,
    binPath,
    wrapperSha256,
    targetSha256,
    readLog: () => readLogOf(dir),
    readFunnel: () => readFunnelOf(dir),
    scenario: () => scenarioOf(dir),
    setScenario,
    approve: () => writeFileSync(join(dir, 'approve'), 'approved by the probe\n', { mode: 0o600 }),
    unapprove: () => rmSync(join(dir, 'approve'), { force: true }),
    forbidden: () => readLogOf(dir).filter((e) => e.forbidden === true),
    refused: () => readLogOf(dir).filter((e) => e.verdict === 'refused'),
    /** Every pid this stand-in ever ran as that is still alive AND still names this file. */
    pids: () => standinPidsOf(dir),
    endAll: (graceMs) => endStandinProcesses(dir, graceMs)
  };
}

function commandOf(pid) {
  const r = spawnSync('/bin/ps', ['-ww', '-p', String(pid), '-o', 'command='], { encoding: 'utf8' });
  return (r.stdout ?? '').trim();
}

/** Live pids from the log and the entries whose command line still names the stand-in. */
export function standinPidsOf(dir) {
  const pids = new Set();
  for (const e of readLogOf(dir)) if (Number.isInteger(e.pid)) pids.add(e.pid);
  for (const f of readFunnelOf(dir)) pids.add(f.pid);
  return [...pids].filter((pid) => isAlive(pid) && commandOf(pid).includes('tailscale-standin.mjs'));
}

/**
 * End every stand-in process a run left, BY PID: SIGINT (the child's own
 * exit), then SIGTERM, then SIGKILL. A pid is signalled only while its command
 * line still names this file, so a reused pid is never touched. Synchronous
 * waits, so it can run from an `exit` handler too.
 */
export function endStandinProcesses(dir, graceMs = 1_500) {
  const ended = [];
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGKILL']) {
    const live = standinPidsOf(dir);
    if (live.length === 0) break;
    for (const pid of live) {
      try {
        process.kill(pid, signal);
        if (!ended.includes(pid)) ended.push(pid);
      } catch {
        /* already gone */
      }
    }
    const until = Date.now() + (signal === 'SIGKILL' ? 500 : graceMs);
    while (Date.now() < until && standinPidsOf(dir).length > 0) spawnSync('/bin/sleep', ['0.1']);
  }
  return { ended, left: standinPidsOf(dir) };
}

/**
 * THE PREFLIGHT every probe runs before it launches anything (SPEC §6.3):
 * `GMUX_TAILSCALE_BIN` must be the wrapper, the wrapper executable and
 * unchanged since it was written, and the file it execs must be byte for byte
 * the stand-in. Anything else refuses the launch.
 */
export function preflightStandin(standin, envValue) {
  const problems = [];
  if (envValue !== standin.binPath) problems.push(`GMUX_TAILSCALE_BIN is ${J(envValue ?? null)}, not the stand-in's wrapper ${standin.binPath}`);
  try {
    accessSync(standin.binPath, fsConstants.X_OK);
    if (!statSync(standin.binPath).isFile()) problems.push('the wrapper is not a file');
  } catch {
    problems.push(`the wrapper ${standin.binPath} is not an executable file`);
  }
  let text = '';
  try {
    text = readFileSync(standin.binPath, 'utf8');
  } catch {
    text = '';
  }
  if (text !== '' && createHash('sha256').update(text).digest('hex') !== standin.wrapperSha256) problems.push('the wrapper changed after it was written');
  const exec = /^exec '([^']+)' '([^']+)' "\$@"$/m.exec(text);
  if (exec === null) problems.push('the wrapper does not exec one node and one file');
  else {
    const target = exec[2];
    let targetSha = null;
    try {
      targetSha = sha256File(target);
    } catch {
      targetSha = null;
    }
    const canonical = sha256File(STANDIN_PATH);
    if (targetSha !== canonical) problems.push(`the wrapper execs ${target}, whose sha256 is ${String(targetSha)}, not the stand-in's ${canonical}`);
  }
  return { ok: problems.length === 0, problems };
}

/** The real Tailscale programs a probe must never see under its app. */
export const REAL_TAILSCALE = [/^\/Applications\/Tailscale\.app\//, /^\/usr\/local\/bin\/tailscale(?:\s|$)/, /^\/opt\/homebrew\/bin\/tailscale(?:\s|$)/];
/** A Tailscale CLI invocation, as opposed to the GUI his Mac runs all day with no arguments. */
const CLI_WORDS = /\s(?:status|serve|funnel|up|down|set|login|logout|switch|cert|file|ip|ping|netcheck|debug|web|lock|drive|exit-node|configure|update|version|whois|nc|ssh|dns|syspolicy|metrics)(?:\s|$)/;

/**
 * Which rows of a process table are a REAL Tailscale that this run must not
 * have caused (SPEC §6.3). A row is flagged when its command is one of the
 * three real programs AND it is either a descendant of one of `roots` (the
 * app this run launched) or a command-line invocation that NO LIVE PROCESS
 * OUTSIDE THE RUN OWNS. His Tailscale app runs all day as
 * `/Applications/Tailscale.app/Contents/MacOS/Tailscale` with no subcommand,
 * and is not flagged: a sampler that flagged it would fail every run on his
 * Mac and so prove nothing.
 *
 * THE OWNED CLI (Phase 316.5's fix round). His own running Tortie publishes
 * its door with a real `Tailscale funnel` child whose parent is his Tortie's
 * door process, alive, and nothing of this run's; flagging it failed every
 * probe's RUN arm on his Mac whenever his door was on (probe:p313, p316, p330
 * and p332, one finding each, his pid). A CLI invocation whose parent is a
 * live process in the table and not under the roots belongs to someone else
 * (see {@link foreignTailscaleIn}, which the watcher reports by pid). One
 * whose parent is gone (reparented to launchd, pid 1) or not in the table is
 * still flagged: that is what an orphaned child of this run's app looks like.
 * Pure, over `pid ppid command` rows.
 */
export function realTailscaleIn(rows, roots = []) {
  const { under, owned } = ancestry(rows, roots);
  return rows.filter((r) => REAL_TAILSCALE.some((re) => re.test(r.command)) && (under(r.pid) || (CLI_WORDS.test(` ${r.command} `) && !owned(r))));
}

/**
 * The real Tailscale CLI invocations a live process outside this run owns:
 * reported by pid as NOT THIS RUN'S, never failed and never signalled. Pure.
 */
export function foreignTailscaleIn(rows, roots = []) {
  const { under, owned } = ancestry(rows, roots);
  return rows.filter((r) => REAL_TAILSCALE.some((re) => re.test(r.command)) && !under(r.pid) && CLI_WORDS.test(` ${r.command} `) && owned(r));
}

/** Ancestry over one process table: under a root, or owned by a live process outside the roots. */
function ancestry(rows, roots) {
  const parent = new Map(rows.map((r) => [r.pid, r.ppid]));
  const rootSet = new Set(roots.filter((p) => Number.isInteger(p) && p > 1));
  const under = (pid) => {
    for (let p = pid, hops = 0; p > 1 && hops < 128; p = parent.get(p) ?? 0, hops += 1) if (rootSet.has(p)) return true;
    return false;
  };
  const owned = (r) => r.ppid > 1 && parent.has(r.ppid);
  return { under, owned };
}

export function processRows() {
  const r = spawnSync('/bin/ps', ['-Ao', 'pid=,ppid=,command='], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const rows = [];
  for (const line of (r.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m !== null) rows.push({ pid: Number(m[1]), ppid: Number(m[2]), command: m[3] });
  }
  return rows;
}

/**
 * Sample the process table every `everyMs` until stopped, and keep every row
 * `realTailscaleIn` flags. In-process (an interval), so it starts nothing a
 * `finally` would have to end. `roots()` is read on every sample.
 */
export function watchForRealTailscale({ roots = () => [], everyMs = 1_000 } = {}) {
  const findings = [];
  const notOurs = [];
  let samples = 0;
  // EVERY root a sample was ever handed, and this process: a relaunch moves
  // the probe's roots, and a real Tailscale an earlier launch (or the probe
  // itself) started must not become "someone else's" because its parent is
  // no longer the current root (the 316.5 fix round).
  const seen = new Set([process.pid]);
  const sample = () => {
    samples += 1;
    for (const p of roots()) if (Number.isInteger(p) && p > 1) seen.add(p);
    const rows = processRows();
    for (const row of realTailscaleIn(rows, [...seen])) {
      if (!findings.some((f) => f.pid === row.pid && f.command === row.command)) findings.push({ ...row, at: Date.now() });
    }
    for (const row of foreignTailscaleIn(rows, [...seen])) {
      if (!notOurs.some((f) => f.pid === row.pid && f.command === row.command)) notOurs.push({ pid: row.pid, ppid: row.ppid, at: Date.now() });
    }
  };
  sample();
  const timer = setInterval(sample, everyMs);
  timer.unref?.();
  return {
    sample,
    findings: () => findings.slice(),
    /** Real Tailscale CLI a live process outside this run owns, by pid (his own Tortie's door, say). */
    notOurs: () => notOurs.slice(),
    samples: () => samples,
    stop: () => {
      clearInterval(timer);
      sample();
      return findings.slice();
    }
  };
}

// ---------------------------------------------------------------------------
// --self-test: every scenario on loopback, every process ended in a finally
// ---------------------------------------------------------------------------

function runSync(standin, args, env = {}) {
  const r = spawnSync(standin.binPath, args, { encoding: 'utf8', timeout: 20_000, env: { ...process.env, ...env } });
  return { code: r.status, signal: r.signal, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

/** Start one funnel child and read its stdout as it arrives. Ended by the caller's finally. */
function startFunnel(standin, args, env = {}) {
  const child = spawn(standin.binPath, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } });
  const text = { out: '', err: '' };
  child.stdout.on('data', (c) => (text.out += c.toString('utf8')));
  child.stderr.on('data', (c) => (text.err += c.toString('utf8')));
  const exited = new Promise((done) => child.once('exit', (code, signal) => done({ code, signal })));
  const until = async (test, ms = 10_000) => {
    const t0 = Date.now();
    while (!test(text) && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 25));
    return test(text);
  };
  return { child, text, exited, until };
}

/** A backend on 127.0.0.1:0 that records every connection's bytes and echoes after the header. */
async function startBackend() {
  const seen = [];
  const sockets = new Set();
  const server = createNetServer((s) => {
    sockets.add(s);
    const rec = { chunks: [], bytes: Buffer.alloc(0) };
    seen.push(rec);
    s.on('data', (c) => {
      rec.chunks.push(c.length);
      rec.bytes = Buffer.concat([rec.bytes, c]);
      const parsed = parseProxyV2Tcp4(rec.bytes);
      const payload = parsed === null ? rec.bytes : parsed.rest;
      if (payload.includes('\n')) s.write(`echo:${payload.toString('utf8')}`);
    });
    s.on('close', () => sockets.delete(s));
    s.on('error', () => undefined);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return {
    port: server.address().port,
    seen,
    close: () =>
      new Promise((r) => {
        for (const s of sockets) s.destroy();
        server.close(() => r());
      })
  };
}

function dialOnce(port, bytes, { waitMs = 1_500 } = {}) {
  return new Promise((done) => {
    const s = netConnect({ host: '127.0.0.1', port });
    let got = '';
    const finish = (ok) => {
      s.destroy();
      done({ ok, got });
    };
    s.setTimeout(waitMs, () => finish(got.length > 0));
    s.on('connect', () => s.write(bytes));
    s.on('data', (c) => {
      got += c.toString('utf8');
      if (got.includes('\n')) finish(true);
    });
    s.on('error', () => finish(false));
    s.on('close', () => finish(got.length > 0));
  });
}

async function selfTest() {
  const results = [];
  const check = (name, ok, said) => {
    results.push({ name, ok });
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${said}\n`);
  };
  const scratch = mkdtempSync(join(tmpdir(), 'p330-standin-'));
  const children = [];
  let backend = null;
  const standin = makeStandin({ dir: join(scratch, 'standin') });
  try {
    // ---- status ----------------------------------------------------------
    let r = runSync(standin, ['status', '--json', '--peers=false']);
    let st = null;
    try {
      st = JSON.parse(r.stdout);
    } catch {
      st = null;
    }
    check(
      'status --json --peers=false answers the pinned shape',
      r.code === 0 && st?.BackendState === 'Running' && st?.Self?.DNSName === 'p330-mac.tail00000.ts.net.' && 'https' in (st?.Self?.CapMap ?? {}) && 'funnel' in (st?.Self?.CapMap ?? {}) &&
        Object.keys(st?.Self?.CapMap ?? {}).includes('https://tailscale.com/cap/funnel-ports?ports=443,8443,10000') &&
        st?.CurrentTailnet?.Name === 'standin@example.com' && st?.CurrentTailnet?.MagicDNSSuffix === 'tail00000.ts.net' && st?.Peer === null && r.stdout.includes('\n  "Self": {'),
      `exit ${String(r.code)}, BackendState ${J(st?.BackendState)}, DNSName ${J(st?.Self?.DNSName)}, CapMap ${J(Object.keys(st?.Self?.CapMap ?? {}))}, tailnet ${J(st?.CurrentTailnet?.Name)}`
    );
    r = runSync(standin, ['status', '--json']);
    check('status --json alone is answered too', r.code === 0 && r.stdout.startsWith('{'), `exit ${String(r.code)}`);
    for (const [label, patch, test] of [
      ['Stopped', { backendState: 'Stopped' }, (s) => s?.BackendState === 'Stopped'],
      ['signed out', { signedOut: true }, (s) => s?.BackendState === 'NeedsLogin' && s?.CurrentTailnet === null],
      ['NeedsMachineAuth', { backendState: 'NeedsMachineAuth' }, (s) => s?.BackendState === 'NeedsMachineAuth'],
      ['no name', { dnsName: '' }, (s) => s?.Self?.DNSName === ''],
      ['no approval yet', { caps: false }, (s) => !('https' in (s?.Self?.CapMap ?? {})) && !('funnel' in (s?.Self?.CapMap ?? {}))],
      ['funnel-ports 443 only', { funnelPorts: [443] }, (s) => Object.keys(s?.Self?.CapMap ?? {}).includes('https://tailscale.com/cap/funnel-ports?ports=443')]
    ]) {
      standin.setScenario({ ...DEFAULT_SCENARIO, ...patch }, { merge: false });
      const s = (() => {
        try {
          return JSON.parse(runSync(standin, ['status', '--json', '--peers=false']).stdout);
        } catch {
          return null;
        }
      })();
      check(`status: ${label}`, test(s), `BackendState ${J(s?.BackendState)}, tailnet ${J(s?.CurrentTailnet?.Name ?? null)}, CapMap ${J(Object.keys(s?.Self?.CapMap ?? {}))}`);
    }
    standin.setScenario({ ...DEFAULT_SCENARIO, unreadable: 'status' }, { merge: false });
    r = runSync(standin, ['status', '--json', '--peers=false']);
    check('status: unreadable is not JSON', r.code === 0 && (() => { try { JSON.parse(r.stdout); return false; } catch { return true; } })(), `${J(r.stdout.slice(0, 30))}`);
    // The profile switch: the third read answers another tailnet.
    standin.setScenario({ ...DEFAULT_SCENARIO }, { merge: false });
    const readsSoFar = answeredStatusReads(standin.dir);
    standin.setScenario({ tailnetAfterReads: { n: readsSoFar + 2, name: 'moved@example.com' } });
    const names = [0, 1, 2].map(() => {
      try {
        return JSON.parse(runSync(standin, ['status', '--json', '--peers=false']).stdout)?.CurrentTailnet?.Name;
      } catch {
        return null;
      }
    });
    check('status: tailnetAfterReads moves the tailnet after n reads', J(names) === J(['standin@example.com', 'standin@example.com', 'moved@example.com']), J(names));
    standin.setScenario({ ...DEFAULT_SCENARIO }, { merge: false });

    // ---- serve status ----------------------------------------------------
    r = runSync(standin, ['serve', 'status', '--json']);
    check('serve status --json is null when nothing is served', r.code === 0 && r.stdout.trim() === 'null', J(r.stdout.trim()));
    standin.setScenario({ servedPorts: [8443], servedWeb: [10000] });
    r = runSync(standin, ['serve', 'status', '--json']);
    let sc = null;
    try {
      sc = JSON.parse(r.stdout);
    } catch {
      sc = null;
    }
    check('serve status shows another serve on 8443 (TCP) and 10000 (web)', sc?.TCP?.['8443']?.TCPForward === '127.0.0.1:1' && sc?.Web?.['p330-mac.tail00000.ts.net:10000'] !== undefined && sc?.Foreground === undefined, J(sc));
    standin.setScenario({ ...DEFAULT_SCENARIO, unreadable: 'serve' }, { merge: false });
    r = runSync(standin, ['serve', 'status', '--json']);
    check('serve status: unreadable is not JSON', (() => { try { JSON.parse(r.stdout); return false; } catch { return true; } })(), J(r.stdout.slice(0, 20)));
    standin.setScenario({ ...DEFAULT_SCENARIO }, { merge: false });

    // ---- funnel: the counted start, the forwarder, the header, SIGINT ------
    backend = await startBackend();
    const argv = ['funnel', '--tcp=8443', '--proxy-protocol=2', `tcp://127.0.0.1:${String(backend.port)}`];
    const f = startFunnel(standin, argv);
    children.push(f.child);
    const printed = await f.until((t) => t.out.includes('Press Ctrl+C to exit.'));
    const want = `${availableLines('p330-mac.tail00000.ts.net', 8443, backend.port)}\n`;
    check('funnel prints the CLI lines, Available on the internet first', printed && f.text.out === want, J(f.text.out.split('\n').slice(0, 3)));
    const entry = standin.readFunnel()[0];
    sc = JSON.parse(runSync(standin, ['serve', 'status', '--json']).stdout);
    const fg = sc?.Foreground?.[entry?.sid];
    check(
      'serve status shows the foreground entry the counted start reads back',
      entry?.pid === f.child.pid && J(fg?.TCP?.['8443']) === J({ TCPForward: `127.0.0.1:${String(backend.port)}`, ProxyProtocol: 2 }) && fg?.TCP?.['8443']?.TerminateTLS === undefined &&
        fg?.AllowFunnel?.['p330-mac.tail00000.ts.net:8443'] === true,
      J(sc)
    );
    const hello = 'p330 ClientHello stand-in\n';
    const through = await dialOnce(entry.forwarderPort, hello);
    const rec = backend.seen[0];
    const header = rec === undefined ? null : parseProxyV2Tcp4(rec.bytes);
    check(
      'the forwarder writes a PROXY v2 TCP4 header from 203.0.113.7 and the first bytes in ONE write, then pipes both ways',
      through.ok && through.got === `echo:${hello}` && header !== null && header.source === '203.0.113.7' && header.dest === SELF_V4 && header.destPort === backend.port &&
        header.rest.toString('utf8') === hello && rec.chunks[0] === header.length + Buffer.byteLength(hello),
      `the backend saw ${J(rec?.chunks)} byte chunk(s), header ${J(header === null ? null : { source: header.source, dest: header.dest, destPort: header.destPort })}; the client read ${J(through.got)}`
    );
    // A forged source and no header at all, for the attack arms.
    standin.setScenario({ proxySource: '100.64.0.9' });
    await dialOnce(entry.forwarderPort, hello);
    const forged = parseProxyV2Tcp4(backend.seen[1]?.bytes ?? Buffer.alloc(0));
    standin.setScenario({ proxy: false });
    await dialOnce(entry.forwarderPort, hello);
    const bare = backend.seen[2]?.bytes ?? Buffer.alloc(0);
    standin.setScenario({ proxy: true, proxySource: '203.0.113.7', coalesce: false });
    await dialOnce(entry.forwarderPort, hello);
    const split = backend.seen[3];
    standin.setScenario({ ...DEFAULT_SCENARIO }, { merge: false });
    check(
      'proxySource forges the source, proxy:false sends none, coalesce:false splits the writes',
      forged?.source === '100.64.0.9' && parseProxyV2Tcp4(bare) === null && bare.toString('utf8') === hello && (split?.chunks.length ?? 0) >= 2,
      `forged ${J(forged?.source)}, bare ${J(bare.toString('utf8'))}, split into ${J(split?.chunks)}`
    );
    // A second funnel on the same port is refused the way tailscaled refuses it.
    r = runSync(standin, argv);
    check('a second funnel on a held port is refused port-taken', r.code === 1 && r.stderr.includes('listener already exists for port 8443'), `exit ${String(r.code)}, ${J(r.stderr.trim())}`);
    f.child.kill('SIGINT');
    const ended = await f.exited;
    const gone = runSync(standin, ['serve', 'status', '--json']).stdout.trim();
    // The entry FILE itself, not only what a reader prunes: the SIGINT path is
    // tailscaled deleting the foreground session, and a stale file would be a
    // session left behind that only the liveness check hides.
    const entryFile = existsSync(join(standin.dir, FUNNELS, `${String(f.child.pid)}.json`));
    check('SIGINT ends it with 0, removes its entry, and the forwarder goes', ended.code === 0 && gone === 'null' && !entryFile && !(await dialOnce(entry.forwarderPort, hello, { waitMs: 500 })).ok && standin.readLog().some((e) => e.event === 'exit' && e.how === 'SIGINT' && e.pid === f.child.pid), `exit ${J(ended)}, serve status ${gone}, the entry file ${entryFile ? 'LEFT BEHIND' : 'removed'}`);

    // A SIGKILLed funnel's entry is ignored, as tailscaled's deferred delete does.
    const k = startFunnel(standin, argv);
    children.push(k.child);
    await k.until((t) => t.out.includes('Press Ctrl+C'));
    k.child.kill('SIGKILL');
    await k.exited;
    check('a SIGKILLed funnel no longer serves', runSync(standin, ['serve', 'status', '--json']).stdout.trim() === 'null' && standin.readFunnel().length === 0, 'serve status is null again');
    // SIGTERM kills it BY the signal, as the real CLI dies of it.
    const t = startFunnel(standin, argv);
    children.push(t.child);
    await t.until((x) => x.out.includes('Press Ctrl+C'));
    t.child.kill('SIGTERM');
    const tended = await t.exited;
    check('SIGTERM ends it by the signal and removes its entry', tended.signal === 'SIGTERM' && standin.readFunnel().length === 0, J(tended));

    // ---- approval --------------------------------------------------------
    standin.setScenario({ ...DEFAULT_SCENARIO, caps: false, approval: 'wait' }, { merge: false });
    const a = startFunnel(standin, argv);
    children.push(a.child);
    const asked = await a.until((x) => x.out.includes(MADE_UP_APPROVAL_URL));
    const urlLine = a.text.out.split('\n').find((l) => l.includes(MADE_UP_APPROVAL_URL));
    await new Promise((res) => setTimeout(res, 300));
    const waiting = !a.text.out.includes('Available on the internet:') && standin.readFunnel().length === 0;
    standin.approve();
    const through2 = await a.until((x) => x.out.includes('Press Ctrl+C to exit.'));
    const caps = (() => {
      try {
        return Object.keys(JSON.parse(runSync(standin, ['status', '--json', '--peers=false']).stdout).Self.CapMap);
      } catch {
        return [];
      }
    })();
    check(
      'approval wait: the URL after nine spaces, nothing published while it waits, then Success. and the counted start',
      asked && urlLine === `         ${MADE_UP_APPROVAL_URL}` && waiting && through2 && a.text.out.indexOf('Success.') < a.text.out.indexOf('Available on the internet:') && caps.includes('https') && caps.includes('funnel'),
      `url line ${J(urlLine)}, waited with nothing published ${String(waiting)}, then ${through2 ? 'published' : 'NOT published'}; caps after ${J(caps)}`
    );
    a.child.kill('SIGINT');
    await a.exited;
    standin.unapprove();
    standin.setScenario({ ...DEFAULT_SCENARIO, caps: false, approval: 'exit0' }, { merge: false });
    r = runSync(standin, argv);
    check('approval exit0: the URL, then exit 0 with nothing published', r.code === 0 && r.stdout.includes(`         ${MADE_UP_APPROVAL_URL}`) && !r.stdout.includes('Available') && standin.readFunnel().length === 0, `exit ${String(r.code)}`);

    // ---- the refusals ----------------------------------------------------
    for (const [word, needle] of [
      ['shields-up', 'shields-up'],
      ['ports443', 'is not allowed for funnel'],
      ['port-taken', 'listener already exists for port 8443'],
      ['busy', 'Another client is changing the serve config'],
      ['not-approved', 'Funnel not available'],
      ['failed', 'error:']
    ]) {
      standin.setScenario({ ...DEFAULT_SCENARIO, refuse: word }, { merge: false });
      r = runSync(standin, argv);
      check(`refuse ${word}: exit 1, the pinned message on stderr, nothing published`, r.code === 1 && r.stderr.includes(needle) && !r.stdout.includes('Available') && standin.readFunnel().length === 0, `exit ${String(r.code)}, ${J(r.stderr.trim().split('\n').pop())}`);
    }
    standin.setScenario({ ...DEFAULT_SCENARIO, servedPorts: [8443] }, { merge: false });
    r = runSync(standin, argv);
    check('a port another serve holds in the background is refused', r.code === 1 && r.stderr.includes('listener already exists for port 8443'), `exit ${String(r.code)}`);
    standin.setScenario({ ...DEFAULT_SCENARIO }, { merge: false });

    // ---- forbidden and unknown argv --------------------------------------
    const beforeRefused = standin.refused().length;
    const forbidden = [
      ['funnel', '--bg', '--tcp=8443', 'tcp://127.0.0.1:1'],
      ['funnel', '--tcp=8443', '--proxy-protocol=2', 'tcp://127.0.0.1:1', '--bg'],
      ['funnel', 'reset'],
      ['serve', 'reset'],
      ['funnel', '--https=443', 'off'],
      ['funnel', '--tls-terminated-tcp=8443', 'tcp://127.0.0.1:1'],
      ['serve', '--tcp=8443', 'tcp://127.0.0.1:1'],
      ['funnel', '--set-path=/x', '--tcp=8443', 'tcp://127.0.0.1:1'],
      ['serve', 'clear', 'svc:x'],
      ['funnel', '--yes', '--tcp=8443', '--proxy-protocol=2', 'tcp://127.0.0.1:1']
    ];
    const forbiddenRuns = forbidden.map((args) => runSync(standin, args));
    const unknown = [['up'], ['version'], ['funnel', '--tcp=8443', 'tcp://127.0.0.1:1'], ['funnel', '--tcp=8443', '--proxy-protocol=1', 'tcp://127.0.0.1:1'], ['funnel', '--tcp=8443', '--proxy-protocol=2', 'tcp://0.0.0.0:1'], ['status']];
    const unknownRuns = unknown.map((args) => runSync(standin, args));
    const log = standin.readLog();
    check(
      'every forbidden argv is refused with exit 2 and recorded as FORBIDDEN',
      forbiddenRuns.every((x) => x.code === 2) && forbidden.every((args) => log.some((e) => e.verdict === 'refused' && e.forbidden === true && J(e.argv) === J(args))),
      `${String(forbiddenRuns.filter((x) => x.code === 2).length)} of ${String(forbidden.length)} refused; ${String(standin.forbidden().length)} forbidden line(s) in the log`
    );
    check(
      'every other argv is refused with exit 2 and recorded, not as forbidden',
      unknownRuns.every((x) => x.code === 2) && unknown.every((args) => log.some((e) => e.verdict === 'refused' && e.forbidden === false && J(e.argv) === J(args))) && standin.refused().length === beforeRefused + forbidden.length + unknown.length,
      `${String(unknownRuns.filter((x) => x.code === 2).length)} of ${String(unknown.length)} refused`
    );

    // ---- the decoy -------------------------------------------------------
    const d = startFunnel(standin, argv, { [STANDIN_ROLE_ENV]: 'decoy' });
    children.push(d.child);
    await d.until((x) => x.out.includes('Press Ctrl+C'));
    const decoyCommand = commandOf(d.child.pid);
    const real = startFunnel(standin, argv);
    children.push(real.child);
    await real.until((x) => x.out.includes('Press Ctrl+C'));
    const realCommand = commandOf(real.child.pid);
    check(
      'the decoy has a real child\'s command line, holds no entry and serves nothing',
      decoyCommand === realCommand && decoyCommand.includes('tailscale-standin.mjs funnel --tcp=8443 --proxy-protocol=2') && standin.readFunnel().length === 1 && standin.readFunnel()[0].pid === real.child.pid,
      `decoy ${J(decoyCommand.slice(-70))}; entries ${J(standin.readFunnel().map((e) => e.pid === real.child.pid ? 'the child' : 'OTHER'))}`
    );
    const left = endStandinProcesses(standin.dir, 1_000);
    check('endStandinProcesses ends every live stand-in pid by pid, and the decoy with them', left.left.length === 0 && left.ended.includes(d.child.pid) && left.ended.includes(real.child.pid), `ended ${String(left.ended.length)}, left ${String(left.left.length)}`);

    // ---- the preflight ---------------------------------------------------
    const good = preflightStandin(standin, standin.binPath);
    const wrongEnv = preflightStandin(standin, '/Applications/Tailscale.app/Contents/MacOS/Tailscale');
    const elsewhere = join(scratch, 'elsewhere.mjs');
    writeFileSync(elsewhere, 'process.exit(0)\n');
    const saved = readFileSync(standin.binPath, 'utf8');
    writeFileSync(standin.binPath, wrapperText(standin.dir, process.execPath, elsewhere), { mode: 0o755 });
    const redirected = preflightStandin({ ...standin, wrapperSha256: sha256File(standin.binPath) }, standin.binPath);
    // Edited, but still execing the stand-in: only the wrapper's own digest can tell.
    writeFileSync(standin.binPath, `${saved}# an edit after the wrapper was written\n`, { mode: 0o755 });
    const edited = preflightStandin(standin, standin.binPath);
    writeFileSync(standin.binPath, saved, { mode: 0o755 });
    check(
      'the preflight passes the wrapper and refuses another program, a redirected target and an edited wrapper',
      good.ok && !wrongEnv.ok && !redirected.ok && redirected.problems.some((p) => p.includes('sha256')) && !edited.ok && edited.problems.length === 1 && edited.problems[0].includes('changed'),
      `good ${String(good.ok)}; wrong env ${J(wrongEnv.problems[0])}; redirected ${J(redirected.problems[0])}; edited ${J(edited.problems[0])}`
    );

    // ---- the real-Tailscale sampler, over rows -------------------------
    const rows = [
      { pid: 100, ppid: 1, command: '/Applications/Tailscale.app/Contents/MacOS/Tailscale' },
      { pid: 200, ppid: 1, command: '/Users/x/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron .' },
      { pid: 201, ppid: 200, command: '/Applications/Tailscale.app/Contents/MacOS/Tailscale' },
      { pid: 300, ppid: 1, command: '/usr/local/bin/tailscale status --json' },
      { pid: 400, ppid: 200, command: '/private/tmp/p/standin/tailscale funnel --tcp=8443' },
      { pid: 500, ppid: 1, command: '/opt/homebrew/bin/tailscaled' },
      { pid: 600, ppid: 1, command: '/Applications/Tailscale.app/Contents/MacOS/Tailscale funnel --tcp=8443 --proxy-protocol=2 tcp://127.0.0.1:5' },
      // His own Tortie, publishing its door: its door process owns a real funnel child.
      { pid: 700, ppid: 1, command: '/Applications/Tortie.app/Contents/MacOS/Tortie' },
      { pid: 701, ppid: 700, command: '/Applications/Tortie.app/Contents/Frameworks/Tortie Helper.app/Contents/MacOS/Tortie Helper --type=utility' },
      { pid: 702, ppid: 701, command: '/Applications/Tailscale.app/Contents/MacOS/Tailscale funnel --tcp=8443 --proxy-protocol=2 tcp://127.0.0.1:49266' },
      // This run's app, two levels down: flagged whatever its words.
      { pid: 210, ppid: 200, command: '/Users/x/node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Helper.app/Contents/MacOS/Electron Helper --type=utility' },
      { pid: 211, ppid: 210, command: '/Applications/Tailscale.app/Contents/MacOS/Tailscale funnel --tcp=8443 --proxy-protocol=2 tcp://127.0.0.1:6' },
      // A CLI whose parent is not in the table: flagged, as before.
      { pid: 800, ppid: 799, command: '/opt/homebrew/bin/tailscale funnel 8443' }
    ];
    const flagged = realTailscaleIn(rows, [200]).map((row) => row.pid);
    check('the sampler flags a real Tailscale under the app, orphaned, or run as a command no live process owns, and not his GUI, the stand-in or his own Tortie\'s funnel', J(flagged) === J([201, 300, 600, 211, 800]), J(flagged));
    const foreign = foreignTailscaleIn(rows, [200]).map((row) => row.pid);
    check('his own Tortie\'s funnel child is reported as not this run\'s, and nothing else is', J(foreign) === J([702]), J(foreign));
    const rootedMine = realTailscaleIn(rows, [200, 700]).map((row) => row.pid);
    check('the same funnel under a root of this run is flagged', rootedMine.includes(702) && foreignTailscaleIn(rows, [200, 700]).length === 0, J(rootedMine));
  } catch (err) {
    check('the self-test', false, `threw: ${String(err?.stack ?? err)}`);
  } finally {
    for (const c of children) {
      if (c.exitCode === null && c.signalCode === null) {
        try {
          c.kill('SIGKILL');
        } catch {
          /* already gone */
        }
      }
    }
    endStandinProcesses(standin.dir, 500);
    await backend?.close();
    rmSync(scratch, { recursive: true, force: true });
  }
  const failed = results.filter((x) => !x.ok).length;
  process.stdout.write(failed === 0 ? `${TAG} self-test PASS: ${String(results.length)} checks, every process it started ended, on loopback only.\n` : `${TAG} self-test FAIL: ${String(failed)} of ${String(results.length)}.\n`);
  return failed === 0;
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === HERE;
if (isMain) {
  if (process.argv[2] === '--self-test' && process.env[STANDIN_DIR_ENV] === undefined) {
    const ok = await selfTest();
    process.exit(ok ? 0 : 1);
  } else {
    await program();
  }
}
