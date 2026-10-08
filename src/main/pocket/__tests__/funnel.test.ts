/**
 * The Funnel child (Phase 330, build/p330/SPEC.md §4.2).
 *
 * NO TEST HERE EXECS A PROGRAM. Every process goes through `FunnelDeps`, and
 * the fakes below behave the way his measurement and the pinned CLI source say
 * the real one does: it prints an approval URL after nine spaces and waits, or
 * `Available on the internet:` and forwards, or a refusal on stderr and exits;
 * it ends on SIGINT. The one real call is `resolveTailscale` reading the file
 * system for which pinned path exists, which executes nothing.
 *
 * What each test holds is named in its title, and every clause it names is one
 * the file's own ablation run takes out and watches go red (reported by the
 * builder, not re-run here).
 */

import { EventEmitter } from 'node:events';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let dir = '';

vi.mock('electron', () => ({
  app: { getPath: () => dir, isPackaged: false }
}));

const logged: string[] = [];
vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const capture =
    (level: string) =>
    (msg: string): void => {
      logged.push(`${level} ${msg}`);
    };
  return {
    ...real,
    getLog: () => ({
      error: capture('error'),
      warn: capture('warn'),
      info: capture('info'),
      debug: capture('debug')
    })
  };
});

const funnel = await import('../funnel');
const {
  ACCOUNT_MARK_RUN_MAX,
  FUNNEL_APPROVAL_WAIT_MS,
  FUNNEL_OUTPUT_CAP_BYTES,
  FUNNEL_RESTART_CAP_MS,
  FUNNEL_RESTART_FLOOR_MS,
  FUNNEL_START_DEADLINE_MS,
  approvalCopyText,
  approvalOpens,
  armFunnelRestart,
  beginFunnelShutdown,
  choosePublicPort,
  classifyFunnelExit,
  funnelArgv,
  funnelProgramOf,
  joinFunnel,
  nextRestartDelay,
  parseServeStatus,
  parseTailnetStatus,
  portsHeld,
  readFunnelRecord,
  readTailnet,
  recordNamesFunnelChild,
  resetFunnelForTests,
  resolveFunnelProgram,
  servesThisDoor,
  startFunnel,
  sweepFunnelOrphan
} = funnel;
type FunnelDeps = import('../funnel').FunnelDeps;
type FunnelChild = import('../funnel').FunnelChild;
type FunnelExecResult = import('../funnel').FunnelExecResult;

// ---------------------------------------------------------------------------
// The stand-in's shapes (ipn/ipnstate, ipn/serve.go)
// ---------------------------------------------------------------------------

const PROGRAM = '/stand/in/tailscale';
const NAME = 'mac.tail00000.ts.net';
const TAILNET = 'example.github';

function statusJson(over: Record<string, unknown> = {}, self: Record<string, unknown> = {}): string {
  return JSON.stringify({
    BackendState: 'Running',
    Self: {
      DNSName: `MAC.tail00000.ts.net.`,
      CapMap: {
        https: null,
        funnel: null,
        'https://tailscale.com/cap/funnel-ports?ports=443,8443,10000': null
      },
      ...self
    },
    CurrentTailnet: { Name: TAILNET, MagicDNSSuffix: 'tail00000.ts.net', MagicDNSEnabled: true },
    Peer: null,
    ...over
  });
}

/** A serve config with this door's foreground session in it. */
function servedJson(localPort: number, publicPort = 8443, handler: Record<string, unknown> = {}): string {
  return JSON.stringify({
    Foreground: {
      sess1: {
        TCP: { [String(publicPort)]: { TCPForward: `127.0.0.1:${String(localPort)}`, ProxyProtocol: 2, ...handler } },
        AllowFunnel: { [`${NAME}:${String(publicPort)}`]: true }
      }
    }
  });
}

// ---------------------------------------------------------------------------
// The fake child and the fake seams
// ---------------------------------------------------------------------------

class FakeStream extends EventEmitter {}

class FakeChild extends EventEmitter {
  readonly stdout = new FakeStream() as unknown as NodeJS.ReadableStream;
  readonly stderr = new FakeStream() as unknown as NodeJS.ReadableStream;
  readonly signals: string[] = [];
  /** Which signals end it. SIGKILL always does. */
  endsOn: Set<string> = new Set(['SIGINT', 'SIGTERM', 'SIGKILL']);
  closed = false;

  constructor(readonly pid: number) {
    super();
  }

  out(text: string): void {
    (this.stdout as unknown as EventEmitter).emit('data', Buffer.from(text, 'utf8'));
  }

  err(text: string): void {
    (this.stderr as unknown as EventEmitter).emit('data', Buffer.from(text, 'utf8'));
  }

  close(code: number | null, signal: string | null = null): void {
    if (this.closed) return;
    this.closed = true;
    this.emit('close', code, signal);
  }

  kill(signal: NodeJS.Signals): boolean {
    this.signals.push(signal);
    if (this.endsOn.has(signal) || signal === 'SIGKILL') this.close(signal === 'SIGINT' ? 0 : null, signal);
    return true;
  }
}

interface World {
  deps: FunnelDeps;
  execs: { file: string; args: string[] }[];
  spawned: { file: string; args: string[]; child: FakeChild }[];
  sleeps: { ms: number; release: () => void }[];
  pidKills: [number, string | number][];
  psCalls: number[];
  clock: number;
}

interface WorldOptions {
  exec?: (args: string[]) => Partial<FunnelExecResult>;
  onSpawn?: (child: FakeChild) => void;
  ps?: (pid: number) => { lstart: string; command: string } | null;
  alive?: (pid: number) => boolean;
  /** pid kill: return value, and what a signal does. */
  onPidSignal?: (pid: number, signal: string) => void;
  resolve?: FunnelDeps['resolve'];
  /** Sleeps at or above this are held until released; below resolve at once. */
  holdFrom?: number;
}

let nextPid = 40_000;

function world(options: WorldOptions = {}): World {
  const w: World = {
    execs: [],
    spawned: [],
    sleeps: [],
    pidKills: [],
    psCalls: [],
    clock: 1_000,
    deps: undefined as unknown as FunnelDeps
  };
  const holdFrom = options.holdFrom ?? 5_000;
  w.deps = {
    resolve:
      options.resolve ??
      (() => ({ resolution: { path: PROGRAM, source: 'dev-override', detail: '' }, overrideSet: true })),
    exec: async (file, args) => {
      w.execs.push({ file, args: [...args] });
      const answer = options.exec?.([...args]) ?? {};
      return {
        stdout: answer.stdout ?? '',
        stderr: answer.stderr ?? '',
        code: answer.code ?? 0,
        failed: answer.failed ?? false,
        errno: answer.errno ?? null
      };
    },
    spawn: (file, args) => {
      const child = new FakeChild((nextPid += 1));
      w.spawned.push({ file, args: [...args], child });
      options.onSpawn?.(child);
      return child as unknown as FunnelChild;
    },
    ps: async (pid) => {
      w.psCalls.push(pid);
      if (options.ps !== undefined) return options.ps(pid);
      return { lstart: 'Tue Sep 29 12:00:00 2026', command: `node /stand/in/standin.mjs funnel ${String(pid)}` };
    },
    kill: (pid, signal) => {
      w.pidKills.push([pid, signal]);
      if (signal === 0) return options.alive?.(pid) ?? false;
      options.onPidSignal?.(pid, signal);
      return true;
    },
    recordPath: () => join(dir, 'gmux', 'pocket-funnel', 'record.json'),
    now: () => w.clock,
    sleep: (ms) =>
      new Promise<void>((resolve) => {
        const entry = { ms, release: () => resolve() };
        w.sleeps.push(entry);
        if (ms < holdFrom) resolve();
      })
  };
  return w;
}

/** Let every queued microtask and one macrotask run. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

/** The door a start publishes. */
const DOOR = { program: PROGRAM, publicName: NAME, publicPort: 8443, localPort: 51234 };

const never = new Promise<void>(() => undefined);

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'p330-funnel-'));
  logged.length = 0;
  resetFunnelForTests();
});

afterEach(() => {
  resetFunnelForTests();
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// The program (SPEC §4.2.1)
// ---------------------------------------------------------------------------

describe('the program', () => {
  it('refuses an override that is set and did not resolve, and never falls back', () => {
    expect(
      funnelProgramOf({
        resolution: { path: '/Applications/Tailscale.app/Contents/MacOS/Tailscale', source: 'pinned', detail: '' },
        overrideSet: true
      })
    ).toEqual({ ok: false, reason: 'override-unusable' });
    expect(
      funnelProgramOf({ resolution: { path: null, source: 'missing', detail: '' }, overrideSet: true })
    ).toEqual({ ok: false, reason: 'override-unusable' });
  });

  it('runs the override when it resolved, the pinned path when none was set, and nothing when none exists', () => {
    expect(
      funnelProgramOf({ resolution: { path: PROGRAM, source: 'dev-override', detail: '' }, overrideSet: true })
    ).toEqual({ ok: true, path: PROGRAM, source: 'dev-override' });
    expect(
      funnelProgramOf({ resolution: { path: '/usr/local/bin/tailscale', source: 'pinned', detail: '' }, overrideSet: false })
    ).toEqual({ ok: true, path: '/usr/local/bin/tailscale', source: 'pinned' });
    expect(
      funnelProgramOf({ resolution: { path: null, source: 'missing', detail: '' }, overrideSet: false })
    ).toEqual({ ok: false, reason: 'no-tailscale' });
  });

  it('with the REAL resolver: a wrapper path that does not exist refuses, whatever is installed on this Mac', () => {
    const resolved = resolveFunnelProgram({
      packaged: false,
      env: { GMUX_TAILSCALE_BIN: join(dir, 'no-such-wrapper') }
    });
    expect(resolved.overrideSet).toBe(true);
    expect(resolved.resolution.source).not.toBe('dev-override');
    expect(funnelProgramOf(resolved)).toEqual({ ok: false, reason: 'override-unusable' });
  });

  it('a packaged build ignores the variable, as it always has', () => {
    const resolved = resolveFunnelProgram({ packaged: true, env: { GMUX_TAILSCALE_BIN: '/tmp/x' } });
    expect(resolved.overrideSet).toBe(false);
    expect(resolved.resolution.source).not.toBe('dev-override');
  });

  it('asks Tailscale NOTHING when the program is refused', async () => {
    const w = world({
      resolve: () => ({ resolution: { path: '/usr/local/bin/tailscale', source: 'pinned', detail: '' }, overrideSet: true })
    });
    expect(await readTailnet(w.deps)).toEqual({ ok: false, reason: 'override-unusable' });
    expect(w.execs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The reads (SPEC §4.2.2)
// ---------------------------------------------------------------------------

describe('the status read', () => {
  it('reads the name without its dot and lowercased, the tailnet, and the capabilities', () => {
    expect(parseTailnetStatus(statusJson())).toEqual({
      ok: true,
      tailnet: TAILNET,
      publicName: NAME,
      asksApproval: false,
      funnelPorts: [
        [443, 443],
        [8443, 8443],
        [10000, 10000]
      ],
      // Phase 333.1 (D4): Tailscale 1.98 and earlier send no User map.
      account: null
    });
  });

  it('asks for approval when either capability is missing, and reads a port range', () => {
    const noFunnel = parseTailnetStatus(statusJson({}, { CapMap: { https: null } }));
    expect(noFunnel.ok && noFunnel.asksApproval).toBe(true);
    const none = parseTailnetStatus(statusJson({}, { CapMap: undefined }));
    expect(none.ok && none.asksApproval && none.funnelPorts === null).toBe(true);
    const ranged = parseTailnetStatus(
      statusJson({}, { CapMap: { https: null, funnel: null, 'https://tailscale.com/cap/funnel-ports?ports=8000-9000': null } })
    );
    expect(ranged.ok && ranged.funnelPorts).toEqual([[8000, 9000]]);
  });

  it('says why when it cannot publish, one word per state', () => {
    expect(parseTailnetStatus(statusJson({ BackendState: 'Stopped' }))).toEqual({ ok: false, reason: 'not-running' });
    expect(parseTailnetStatus(statusJson({ BackendState: 'NeedsLogin' }))).toEqual({ ok: false, reason: 'signed-out' });
    expect(parseTailnetStatus(statusJson({ BackendState: 'NeedsMachineAuth' }))).toEqual({
      ok: false,
      reason: 'signed-out'
    });
    expect(parseTailnetStatus(statusJson({ CurrentTailnet: null }))).toEqual({ ok: false, reason: 'signed-out' });
    expect(parseTailnetStatus(statusJson({}, { DNSName: '' }))).toEqual({ ok: false, reason: 'no-name' });
    expect(parseTailnetStatus(statusJson({}, { DNSName: 'mac.example.com.' }))).toEqual({ ok: false, reason: 'no-name' });
    expect(parseTailnetStatus('not json')).toEqual({ ok: false, reason: 'unreadable' });
    expect(parseTailnetStatus('[]')).toEqual({ ok: false, reason: 'unreadable' });
  });

  // -------------------------------------------------------------------------
  // The account (Phase 333.1, build/p3331/SPEC.md D4; r2 §Attack F21, F22)
  // -------------------------------------------------------------------------

  /** Tailscale 1.100 and later under --peers=false: the self user, and nobody else. */
  const SELF_USER = { ID: 123456, LoginName: 'person@example.com', DisplayName: 'Person', ProfilePicURL: '' };
  const withUser = (users: unknown, uid: unknown = 123456): string =>
    statusJson({ User: users }, { UserID: uid });
  const accountOf = (text: string): string | null | 'refused' => {
    const facts = parseTailnetStatus(text);
    return facts.ok ? facts.account : 'refused';
  };

  it('reads the account from the 1.102 shape, and none from the 1.94 shape', () => {
    expect(accountOf(withUser({ '123456': SELF_USER }))).toBe('person@example.com');
    // 1.94.1: `User` is filled only when peers are asked for, so it is absent or null.
    expect(accountOf(statusJson({}, { UserID: 123456 }))).toBeNull();
    expect(accountOf(withUser(null))).toBeNull();
    // Every other field reads what it read without the account.
    const { account, ...rest } = parseTailnetStatus(withUser({ '123456': SELF_USER })) as Extract<
      ReturnType<typeof parseTailnetStatus>,
      { ok: true }
    >;
    expect(account).toBe('person@example.com');
    const { account: none, ...without } = parseTailnetStatus(statusJson()) as Extract<
      ReturnType<typeof parseTailnetStatus>,
      { ok: true }
    >;
    expect(none).toBeNull();
    expect(rest).toEqual(without);
  });

  it('moves no refusal: a User map beside every refusing state still refuses the same word', () => {
    const user = { User: { '123456': SELF_USER } };
    expect(parseTailnetStatus(statusJson({ ...user, BackendState: 'Stopped' }))).toEqual({ ok: false, reason: 'not-running' });
    expect(parseTailnetStatus(statusJson({ ...user, BackendState: 'NeedsLogin' }))).toEqual({ ok: false, reason: 'signed-out' });
    expect(parseTailnetStatus(statusJson({ ...user, CurrentTailnet: null }))).toEqual({ ok: false, reason: 'signed-out' });
    expect(parseTailnetStatus(statusJson(user, { DNSName: '', UserID: 123456 }))).toEqual({ ok: false, reason: 'no-name' });
  });

  it('reads the one entry for a user id past 2^53, whose key JSON.parse cannot spell, and nothing for two entries', () => {
    // MEASURED by the spec step: 9007199254740993 parses to 9007199254740992,
    // whose key misses the map's "9007199254740993".
    const big = (users: Record<string, unknown>): string =>
      withUser(users, 'BIGID').replace('"BIGID"', '9007199254740993');
    expect(accountOf(big({ '9007199254740993': { ...SELF_USER, ID: 1 } }))).toBe('person@example.com');
    expect(
      accountOf(big({ '9007199254740993': SELF_USER, '9007199254740995': { ...SELF_USER, LoginName: 'other@example.com' } }))
    ).toBeNull();
  });

  it('draws nothing for a SAFE id whose key is absent, even from a one-entry map (r2 F21)', () => {
    expect(accountOf(withUser({ '999': SELF_USER }, 123456))).toBeNull();
    expect(accountOf(withUser({ '123456': SELF_USER }, '123456'))).toBeNull();
    expect(accountOf(statusJson({ User: { '123456': SELF_USER } }))).toBeNull();
    expect(accountOf(withUser({ '123456': SELF_USER }, null))).toBeNull();
    expect(accountOf(withUser({ '123456': SELF_USER }, 1.5))).toBeNull();
  });

  it('draws nothing it cannot draw safely: empty, not a string, over 256 units, or holding a control or format character (r2 F22)', () => {
    const named = (login: unknown): string | null | 'refused' => accountOf(withUser({ '123456': { ...SELF_USER, LoginName: login } }));
    expect(named('')).toBeNull();
    expect(named(42)).toBeNull();
    expect(named(null)).toBeNull();
    expect(named({ name: 'x' })).toBeNull();
    expect(accountOf(withUser({ '123456': 'person@example.com' }))).toBeNull();
    expect(named('a'.repeat(256))).toBe('a'.repeat(256));
    expect(named('a'.repeat(257))).toBeNull();
    expect(named('x'.repeat(64 * 1024))).toBeNull();
    // Written as escapes, so no raw control, bidi or zero-width character enters this file.
    for (const odd of ['\u202E', '\u0007', '\u200B', '\uFEFF', '\u2066', '\u0000', '\u001B']) {
      expect(named(`person${odd}@example.com`), JSON.stringify(odd)).toBeNull();
    }
    // A letter outside ASCII is drawn: only what cannot be drawn safely is refused.
    expect(named('pérson@example.com')).toBe('pérson@example.com');
  });

  it('draws nothing that breaks step 1 onto other lines or stacks over it (the fix round): separators, surrogates, private and unassigned code points, long runs of marks', () => {
    const named = (login: unknown): string | null | 'refused' => accountOf(withUser({ '123456': { ...SELF_USER, LoginName: login } }));
    // Built from code points, so no raw character of these classes enters this file.
    const at = (cp: number): string => `person${String.fromCodePoint(cp)}@example.com`;
    // A line separator and a paragraph separator, alone and two hundred in a row.
    for (const cp of [0x2028, 0x2029]) {
      expect(named(at(cp)), cp.toString(16)).toBeNull();
      expect(named(String.fromCodePoint(cp).repeat(200)), cp.toString(16)).toBeNull();
    }
    // A lone surrogate, each half (JSON carries it as an escape).
    for (const unit of ['\\ud800', '\\udfff']) {
      const text = withUser({ '123456': { ...SELF_USER, LoginName: 'PLACEHOLDER' } }).replace('PLACEHOLDER', `person${unit}@example.com`);
      expect(accountOf(text), unit).toBeNull();
    }
    // A private-use code point, in the BMP and past it; and an unassigned one.
    for (const cp of [0xe000, 0xf8ff, 0xf0000, 0xe0080]) expect(named(at(cp)), cp.toString(16)).toBeNull();
    // Combining marks: a real name's few on one letter are drawn, a tower is not.
    const marks = (n: number): string => `pe${String.fromCodePoint(0x0301).repeat(n)}rson@example.com`;
    expect(named(marks(1))).toBe(marks(1));
    expect(named(marks(ACCOUNT_MARK_RUN_MAX))).toBe(marks(ACCOUNT_MARK_RUN_MAX));
    expect(named(marks(ACCOUNT_MARK_RUN_MAX + 1))).toBeNull();
    expect(named(`a${String.fromCodePoint(0x0301).repeat(250)}`)).toBeNull();
    // An Indic syllable's nukta, vowel sign and anusvara, three marks on one letter, is a real name's.
    const syllable = [0x0921, 0x093c, 0x0947, 0x0902].map((p) => String.fromCodePoint(p)).join('');
    expect(named(`${syllable}@example.com`)).toBe(`${syllable}@example.com`);
    // A long name with no break in it is still drawn: the sheet cuts it to one line.
    expect(named('W'.repeat(256))).toBe('W'.repeat(256));
  });

  it('carries the account through the read', async () => {
    const w = world({
      exec: (args) =>
        args[0] === 'status' ? { stdout: withUser({ '123456': SELF_USER }) } : { stdout: 'null' }
    });
    const read = await readTailnet(w.deps);
    expect(read.ok && read.account).toBe('person@example.com');
  });

  it('runs exactly the two argvs, of the resolved program, and nothing else', async () => {
    const w = world({
      exec: (args) => (args[0] === 'status' ? { stdout: statusJson() } : { stdout: 'null' })
    });
    const read = await readTailnet(w.deps);
    expect(read.ok).toBe(true);
    expect(w.execs).toEqual([
      { file: PROGRAM, args: ['status', '--json', '--peers=false'] },
      { file: PROGRAM, args: ['serve', 'status', '--json'] }
    ]);
  });

  it('says not-running when the program cannot reach its daemon, and no-tailscale when it is gone', async () => {
    const unreachable = world({
      exec: () => ({ failed: true, code: 1, stderr: 'failed to connect to local tailscaled; it doesn’t appear to be running' })
    });
    expect(await readTailnet(unreachable.deps)).toEqual({ ok: false, reason: 'not-running' });
    const gone = world({ exec: () => ({ failed: true, code: null, errno: 'ENOENT' }) });
    expect(await readTailnet(gone.deps)).toEqual({ ok: false, reason: 'no-tailscale' });
    const junk = world({ exec: () => ({ stdout: '{"BackendState":' }) });
    expect(await readTailnet(junk.deps)).toEqual({ ok: false, reason: 'unreadable' });
  });
});

describe('the serve config', () => {
  it('reads null as nothing served, and junk as unreadable', () => {
    expect(parseServeStatus('null')).toBeNull();
    expect(parseServeStatus('')).toBeNull();
    expect(parseServeStatus('nope')).toBeUndefined();
  });

  it('holds a port in TCP, in Web, and in any foreground session', () => {
    const config = parseServeStatus(
      JSON.stringify({
        TCP: { '443': { HTTPS: true } },
        Web: { [`${NAME}:8443`]: { Handlers: {} } },
        Foreground: { s: { TCP: { '10000': { TCPForward: '127.0.0.1:1' } } } }
      })
    );
    expect([...portsHeld(config ?? null)].sort((a, b) => a - b)).toEqual([443, 8443, 10000]);
  });

  it('does not count this door’s own child as somebody else holding its port', () => {
    const config = parseServeStatus(servedJson(51234)) ?? null;
    expect(portsHeld(config).has(8443)).toBe(true);
    expect(portsHeld(config, '127.0.0.1:51234').has(8443)).toBe(false);
    expect(portsHeld(config, '127.0.0.1:1').has(8443)).toBe(true);
  });
});

describe('the public port (SPEC §4.2.3)', () => {
  const none = new Set<number>();

  it('keeps the stored port while it is free, and never takes 443', () => {
    expect(choosePublicPort(10000, none, null)).toEqual({ ok: true, port: 10000 });
    expect(choosePublicPort(0, none, null)).toEqual({ ok: true, port: 8443 });
    expect(choosePublicPort(443, none, null)).toEqual({ ok: true, port: 8443 });
    expect(choosePublicPort(8443, new Set([8443]), null)).toEqual({ ok: true, port: 10000 });
  });

  it('refuses ports-taken when both are held', () => {
    expect(choosePublicPort(8443, new Set([8443, 10000]), null)).toEqual({ ok: false, reason: 'ports-taken' });
  });

  it('keeps to the tailnet’s funnel ports when it names them', () => {
    expect(choosePublicPort(0, none, [[10000, 10000]])).toEqual({ ok: true, port: 10000 });
    expect(choosePublicPort(0, none, [[443, 443]])).toEqual({ ok: false, reason: 'funnel-ports' });
  });
});

describe('the argv, exactly (SPEC §4.2.4)', () => {
  it('is funnel, the public port, PROXY v2, and the loopback target: nothing else', () => {
    expect(funnelArgv(8443, 51234)).toEqual([
      'funnel',
      '--tcp=8443',
      '--proxy-protocol=2',
      'tcp://127.0.0.1:51234'
    ]);
  });
});

describe('the approval page Tortie will open', () => {
  it('is https on exactly login.tailscale.com, with no port and no credentials', () => {
    expect(approvalOpens('https://login.tailscale.com/f/funnel?node=nMADEUP')).toBe(true);
    for (const bad of [
      'http://login.tailscale.com/f/funnel',
      'https://login.tailscale.com.evil/f/funnel',
      'https://evil.example/login.tailscale.com',
      'https://login.tailscale.com:8443/f/funnel',
      'https://login.tailscale.com:443/f/funnel',
      'https://user@login.tailscale.com/f/funnel',
      'https://user:pass@login.tailscale.com/f/funnel',
      'https://:pass@login.tailscale.com/f/funnel',
      'javascript:alert(1)',
      'not a url'
    ]) {
      expect(approvalOpens(bad), bad).toBe(false);
    }
    expect(approvalOpens(null)).toBe(false);
  });

  // The 333.1 reverify (2026-10-08): Copy link hands the held text to a second
  // person, who pastes it into whatever reads it, and two parsers can read one
  // text as two hosts. What is copied is new URL's spelling, which every parser
  // reads as login.tailscale.com; opening is today's, unchanged.
  describe('what Copy link writes (approvalCopyText)', () => {
    // RFC 3986 Appendix B, the reading a paste into another app may use.
    const rfc3986Authority = (text: string): string | null => /^(?:[^:/?#]+:)?(?:\/\/([^/?#]*))?/.exec(text)?.[1] ?? null;
    const backslashed = 'https://login.tailscale.com\\@evil.example/f/funnel';

    it('the finding: one text, two hosts, and approvalOpens passes it as it did before the phase', () => {
      expect(new URL(backslashed).hostname).toBe('login.tailscale.com');
      expect(rfc3986Authority(backslashed)).toBe('login.tailscale.com\\@evil.example');
      expect(approvalOpens(backslashed)).toBe(true);
    });

    it('writes new URL’s spelling, which begins https://login.tailscale.com/ and every parser reads as that host', () => {
      expect(approvalCopyText(backslashed)).toBe('https://login.tailscale.com/@evil.example/f/funnel');
      expect(approvalCopyText('HTTPS://LOGIN.TAILSCALE.COM/f/funnel')).toBe('https://login.tailscale.com/f/funnel');
      expect(approvalCopyText('https://login.tailscale.com\\\\evil.example/f')).toBe('https://login.tailscale.com//evil.example/f');
      for (const printed of [
        backslashed,
        'https://login.tailscale.com\\f\\funnel',
        'https://login.tailscale.com\\\\evil.example/f',
        'HTTPS://LOGIN.TAILSCALE.COM/f/funnel',
        'https://Login.Tailscale.com/f/funnel',
        'https:login.tailscale.com/f/funnel',
        'https:/login.tailscale.com/f/funnel',
        'https:///login.tailscale.com/f/funnel',
        'https://login%2etailscale.com/f/funnel',
        'https://login.tailscale.com',
        'https://login.tailscale.com?node=nMADEUP',
        'https://login.tailscale.com/./f/funnel',
        'https://login.tailscale.com/%2e%2e/f/funnel',
        'https://login.tailscale.com/f/fun nel',
        'https://login.tailscale.com/f/funnel?node=n\tMADEUP',
        'https://login.tailscale.com/f/\nfunnel',
        ' https://login.tailscale.com/f/funnel',
        'https://login.tailscale.com/f/funnel ',
        'https://login.tailscale.com/f/<funnel>',
        'https://login.tailscale.com/f/funnel?q=a\\@evil.example',
        'https://login.tailscale.com/f/funnel#\\@evil.example',
        'https://login.tailscale.com/@evil.example/f/funnel',
        'https://login.tailscale.com/f/funnel?next=https://evil.example/'
      ]) {
        const copied = approvalCopyText(printed);
        expect(copied, JSON.stringify(printed)).toBe(new URL(printed).href);
        expect(copied?.startsWith('https://login.tailscale.com/'), JSON.stringify(printed)).toBe(true);
        expect(rfc3986Authority(copied ?? ''), JSON.stringify(printed)).toBe('login.tailscale.com');
        expect(new URL(copied ?? '').href, JSON.stringify(printed)).toBe(copied);
        expect(copied, JSON.stringify(printed)).not.toMatch(/\s/u);
      }
    });

    it('copies the link Tailscale prints byte for byte', () => {
      expect(approvalCopyText('https://login.tailscale.com/f/funnel?node=nMADEUP')).toBe('https://login.tailscale.com/f/funnel?node=nMADEUP');
    });

    it('copies nothing approvalOpens refuses', () => {
      for (const bad of [
        'http://login.tailscale.com/f/funnel',
        'https://login.tailscale.com.evil/f/funnel',
        'https://login.tailscale.com./f/funnel',
        'https://login.tailscale.com.\\@evil.example/',
        'https://login.tailscale.com%5C@evil.example/f',
        'https://login.tailscale.com\t@evil.example/f',
        'https://evil.example/login.tailscale.com',
        'https://login.tailscale.com:8443/f/funnel',
        'https://login.tailscale.com:443/f/funnel',
        'https://user@login.tailscale.com/f/funnel',
        'https://user:pass@login.tailscale.com/f/funnel',
        'https://:pass@login.tailscale.com/f/funnel',
        'javascript:alert(1)',
        'not a url',
        ''
      ]) {
        expect(approvalOpens(bad), JSON.stringify(bad)).toBe(false);
        expect(approvalCopyText(bad), JSON.stringify(bad)).toBeNull();
      }
      expect(approvalCopyText(null)).toBeNull();
    });
  });

  it('never takes Tailscale’s download page for an approval page (Phase 333.1, D13)', () => {
    expect(funnel.TAILSCALE_DOWNLOAD_PAGE).toBe('https://tailscale.com/download');
    expect(approvalOpens(funnel.TAILSCALE_DOWNLOAD_PAGE)).toBe(false);
  });
});

describe('the refusals, in order (SPEC §4.2.5)', () => {
  const rows: [string, number | null, boolean, string][] = [
    ['Unable to turn on Funnel while shields-up is enabled', 1, false, 'shields-up'],
    ['port 8443 is not allowed for funnel', 1, false, 'funnel-ports'],
    ['Funnel not available; "funnel" node attribute not set.', 1, false, 'not-approved'],
    ['listener already exists for port 8443', 1, false, 'port-taken'],
    ['foreground listener already exists for port 8443', 1, false, 'port-taken'],
    ['want to serve "tcp", but port 8443 is already serving "https"', 1, false, 'port-taken'],
    ['cannot serve TCP; already serving web on 8443 for mac', 1, false, 'port-taken'],
    ['Another client is changing the serve config; please try again.', 1, false, 'busy'],
    ['', 0, true, 'not-approved'],
    ['', 0, false, 'failed'],
    ['anything else', 1, false, 'failed']
  ];
  for (const [stderr, code, urlSeen, reason] of rows) {
    it(`reads ${JSON.stringify(stderr || `exit ${String(code)}${urlSeen ? ' after a URL' : ''}`)} as ${reason}`, () => {
      expect(classifyFunnelExit({ stderr, code, urlSeen })).toBe(reason);
    });
  }

  it('asks shields-up before a port, whichever comes first in the text', () => {
    expect(
      classifyFunnelExit({ stderr: 'listener already exists for port 1\nshields-up', code: 1, urlSeen: false })
    ).toBe('shields-up');
  });
});

// ---------------------------------------------------------------------------
// The start (SPEC §4.2.5)
// ---------------------------------------------------------------------------

describe('a counted start', () => {
  it('spawns exactly the argv, records the child at 0o600, and counts only after the read-back', async () => {
    let served = 'null';
    const w = world({
      exec: () => ({ stdout: served }),
      onSpawn: (child) => {
        setImmediate(() => {
          served = servedJson(DOOR.localPort);
          child.out(`Available on the internet:\n\n|-- tcp://${NAME}:8443 (TLS over TCP, PROXY protocol v2)\n|--> tcp://127.0.0.1:${String(DOOR.localPort)}\n\nPress Ctrl+C to exit.\n`);
        });
      }
    });
    const outcome = await startFunnel(w.deps, DOOR, never);
    expect(outcome.kind).toBe('published');
    expect(w.spawned.map((s) => [s.file, ...s.args])).toEqual([
      [PROGRAM, 'funnel', '--tcp=8443', '--proxy-protocol=2', 'tcp://127.0.0.1:51234']
    ]);
    const path = join(dir, 'gmux', 'pocket-funnel', 'record.json');
    const record = readFunnelRecord(path);
    const pid = w.spawned[0]?.child.pid ?? 0;
    expect(record).toEqual({
      pid,
      lstart: 'Tue Sep 29 12:00:00 2026',
      command: `node /stand/in/standin.mjs funnel ${String(pid)}`,
      argv: [PROGRAM, 'funnel', '--tcp=8443', '--proxy-protocol=2', 'tcp://127.0.0.1:51234'],
      at: 1_000
    });
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(statSync(join(dir, 'gmux', 'pocket-funnel')).mode & 0o777).toBe(0o700);
    // The read-back ran after the cue, and it is `serve status --json` alone.
    expect(w.execs.every((e) => e.args.join(' ') === 'serve status --json')).toBe(true);
    expect(w.spawned[0]?.child.signals).toEqual([]);
    if (outcome.kind === 'published') {
      await outcome.run.stop();
      expect(readFunnelRecord(path)).toBeNull();
    }
  });

  // THE FIX ROUND (lens 2, probe:p330 A4, 2 of 2 in-app starts): a program
  // that `exec`s prints one command line before its exec and another after.
  // The record taken straight after the spawn held the first, and a crashed
  // run's orphan could then never be proved. It is taken again at the first
  // line of output and at the counted start, so the one on disk is the last.
  it('follows an exec: the record holds the command ps prints after the child spoke, not before', async () => {
    let served = 'null';
    let spoke = false;
    const w = world({
      exec: () => ({ stdout: served }),
      ps: (pid) => ({
        lstart: 'Tue Sep 29 12:00:00 2026',
        command: spoke ? `node /r/build/p330/tailscale-standin.mjs funnel ${String(pid)}` : `/bin/sh /s/tailscale funnel ${String(pid)}`
      }),
      onSpawn: (child) => {
        setImmediate(() => {
          spoke = true;
          served = servedJson(DOOR.localPort);
          child.out('Available on the internet:\n\nPress Ctrl+C to exit.\n');
        });
      }
    });
    const outcome = await startFunnel(w.deps, DOOR, never);
    expect(outcome.kind).toBe('published');
    const pid = w.spawned[0]?.child.pid ?? 0;
    expect(w.psCalls.length).toBeGreaterThanOrEqual(2);
    expect(readFunnelRecord(join(dir, 'gmux', 'pocket-funnel', 'record.json'))?.command).toBe(
      `node /r/build/p330/tailscale-standin.mjs funnel ${String(pid)}`
    );
    if (outcome.kind === 'published') await outcome.run.stop();
  });

  it('narrows a record directory that already exists, and never the directory above it', () => {
    mkdirSync(join(dir, 'gmux', 'pocket-funnel'), { recursive: true, mode: 0o755 });
    chmodSync(join(dir, 'gmux'), 0o755);
    chmodSync(join(dir, 'gmux', 'pocket-funnel'), 0o755);
    const path = join(dir, 'gmux', 'pocket-funnel', 'record.json');
    funnel.writeFunnelRecord(path, { pid: 4242, lstart: 'x', command: 'y', argv: [], at: 1 });
    expect(statSync(join(dir, 'gmux', 'pocket-funnel')).mode & 0o777).toBe(0o700);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(statSync(join(dir, 'gmux')).mode & 0o777).toBe(0o755);
  });

  it('writes no record once a stop has begun, even when ps answers after it', async () => {
    let answer: (facts: { lstart: string; command: string }) => void = () => undefined;
    const w = world();
    w.deps.ps = (pid) => {
      w.psCalls.push(pid);
      return new Promise((resolve) => {
        answer = resolve;
      });
    };
    const child = new FakeChild(55_555);
    const run = new funnel.FunnelRun(child as unknown as FunnelChild, w.deps, [PROGRAM, 'funnel']);
    const recorded = run.record();
    await settle();
    const stopped = run.stop();
    answer({ lstart: 'Tue Sep 29 12:00:00 2026', command: 'late' });
    expect(await recorded).toBe(false);
    expect(await stopped).toBe(true);
    expect(readFunnelRecord(join(dir, 'gmux', 'pocket-funnel', 'record.json'))).toBeNull();
  });

  const readBacks: [string, string][] = [
    ['no foreground entry at all', 'null'],
    ['a foreground entry forwarding somewhere else', servedJson(1)],
    ['TLS terminated by tailscaled', servedJson(51234, 8443, { TerminateTLS: NAME })],
    ['no PROXY header', servedJson(51234, 8443, { ProxyProtocol: 0 })],
    ['PROXY v1', servedJson(51234, 8443, { ProxyProtocol: 1 })],
    ['another public port', servedJson(51234, 10000)],
    [
      'Funnel off for the name',
      JSON.stringify({
        Foreground: { s: { TCP: { '8443': { TCPForward: '127.0.0.1:51234', ProxyProtocol: 2 } }, AllowFunnel: {} } }
      })
    ]
  ];
  for (const [name, served] of readBacks) {
    it(`does NOT count a start the config does not show: ${name}`, async () => {
      const w = world({
        exec: () => ({ stdout: served }),
        onSpawn: (child) => setImmediate(() => child.out('Available on the internet:\n'))
      });
      const outcome = await startFunnel(w.deps, DOOR, never);
      expect(outcome).toEqual({ kind: 'refused', reason: 'failed' });
      expect(w.spawned[0]?.child.signals[0]).toBe('SIGINT');
      expect(w.execs.length).toBe(3);
    });
  }

  it('stops at the deadline when nothing is printed', async () => {
    const w = world({ holdFrom: FUNNEL_START_DEADLINE_MS });
    const started = startFunnel(w.deps, DOOR, never);
    await settle();
    const deadline = w.sleeps.find((s) => s.ms === FUNNEL_START_DEADLINE_MS);
    expect(deadline).toBeDefined();
    deadline?.release();
    expect(await started).toEqual({ kind: 'refused', reason: 'failed' });
    expect(w.spawned[0]?.child.signals[0]).toBe('SIGINT');
  });
});

describe('every other ending is a refusal, exit 0 included', () => {
  const endings: [string, string, number, string][] = [
    ['shields-up', 'Unable to turn on Funnel while shields-up is enabled\n', 1, 'shields-up'],
    ['a port already served', 'listener already exists for port 8443\n', 1, 'port-taken'],
    ['a busy config', 'Another client is changing the serve config; please try again.\n', 1, 'busy'],
    ['ports without 443', 'port 443 is not allowed for funnel; allowed ports are: 8443\n', 1, 'funnel-ports'],
    ['exit 0 with nothing printed', '', 0, 'failed']
  ];
  for (const [name, stderr, code, reason] of endings) {
    it(`${name} → ${reason}, and the record is gone`, async () => {
      const w = world({
        onSpawn: (child) =>
          setImmediate(() => {
            if (stderr.length > 0) child.err(stderr);
            child.close(code);
          })
      });
      expect(await startFunnel(w.deps, DOOR, never)).toEqual({ kind: 'refused', reason });
      expect(readFunnelRecord(join(dir, 'gmux', 'pocket-funnel', 'record.json'))).toBeNull();
      // Nothing either stream carried reached a log line: a WORD did.
      const log = logged.join('\n');
      expect(log).not.toContain('8443');
      expect(log).not.toContain('Unable to turn on');
      expect(log).not.toContain('listener already exists');
      expect(log).not.toContain('Another client');
      expect(log).toContain(`the Funnel child did not publish: ${reason}`);
    });
  }

  it('a non-admin: the URL printed and exit 0 is not-approved', async () => {
    const approvals: [string, boolean][] = [];
    const w = world({
      onSpawn: (child) =>
        setImmediate(() => {
          child.out('\nFunnel is not enabled on your tailnet.\n\n         https://login.tailscale.com/f/funnel?node=nMADEUP\n\n');
          child.close(0);
        })
    });
    const outcome = await startFunnel(w.deps, DOOR, never, {
      onApproval: (url, opens) => approvals.push([url, opens])
    });
    expect(outcome).toEqual({ kind: 'refused', reason: 'not-approved' });
    expect(approvals).toEqual([['https://login.tailscale.com/f/funnel?node=nMADEUP', true]]);
    expect(logged.join('\n')).not.toContain('login.tailscale.com');
  });
});

describe('the approval wait', () => {
  it('waits on Tailscale’s page, and carries on to a counted start after Success.', async () => {
    let served = 'null';
    let child: FakeChild | null = null;
    const events: string[] = [];
    const w = world({
      holdFrom: FUNNEL_START_DEADLINE_MS,
      exec: () => ({ stdout: served }),
      onSpawn: (c) => {
        child = c;
        setImmediate(() => c.out('\nTo turn on Funnel, visit:\n\n         https://login.tailscale.com/f/funnel?node=nMADEUP\n\n'));
      }
    });
    const started = startFunnel(w.deps, DOOR, never, {
      onApproval: (url, opens) => events.push(`approval ${String(opens)} ${url}`),
      onApproved: () => events.push('approved')
    });
    await settle();
    expect(events).toEqual(['approval true https://login.tailscale.com/f/funnel?node=nMADEUP']);
    // The 20 s deadline no longer applies; the ten minute wait does.
    expect(w.sleeps.some((s) => s.ms === FUNNEL_APPROVAL_WAIT_MS)).toBe(true);
    w.sleeps.find((s) => s.ms === FUNNEL_START_DEADLINE_MS)?.release();
    await settle();
    served = servedJson(DOOR.localPort);
    (child as unknown as FakeChild).out('Success.\nAvailable on the internet:\n');
    const outcome = await started;
    expect(outcome.kind).toBe('published');
    expect(events).toEqual([
      'approval true https://login.tailscale.com/f/funnel?node=nMADEUP',
      'approved'
    ]);
    if (outcome.kind === 'published') await outcome.run.stop();
  });

  it('says so, and opens nothing, when the page is not Tailscale’s login host', async () => {
    const events: [string, boolean][] = [];
    const w = world({
      holdFrom: FUNNEL_START_DEADLINE_MS,
      onSpawn: (c) => setImmediate(() => c.out('         https://login.tailscale.com.evil/f/funnel\n'))
    });
    const superseded = { fire: (): void => undefined };
    const press = new Promise<void>((resolve) => {
      superseded.fire = resolve;
    });
    const started = startFunnel(w.deps, DOOR, press, { onApproval: (u, o) => events.push([u, o]) });
    await settle();
    expect(events).toEqual([['https://login.tailscale.com.evil/f/funnel', false]]);
    superseded.fire();
    expect(await started).toEqual({ kind: 'superseded' });
  });

  it('gives up after ten minutes and stops the child', async () => {
    const w = world({
      holdFrom: FUNNEL_START_DEADLINE_MS,
      onSpawn: (c) => setImmediate(() => c.out('         https://login.tailscale.com/f/funnel?node=nMADEUP\n'))
    });
    const started = startFunnel(w.deps, DOOR, never);
    await settle();
    w.sleeps.find((s) => s.ms === FUNNEL_APPROVAL_WAIT_MS)?.release();
    expect(await started).toEqual({ kind: 'refused', reason: 'approval-timeout' });
    expect(w.spawned[0]?.child.signals[0]).toBe('SIGINT');
  });

  it('ends at once when a later press arrives, and the child is stopped', async () => {
    let fire = (): void => undefined;
    const press = new Promise<void>((resolve) => {
      fire = resolve;
    });
    const w = world({
      holdFrom: FUNNEL_START_DEADLINE_MS,
      onSpawn: (c) => setImmediate(() => c.out('         https://login.tailscale.com/f/funnel?node=nMADEUP\n'))
    });
    const started = startFunnel(w.deps, DOOR, press);
    await settle();
    fire();
    expect(await started).toEqual({ kind: 'superseded' });
    expect(w.spawned[0]?.child.signals).toEqual(['SIGINT']);
    expect(readFunnelRecord(join(dir, 'gmux', 'pocket-funnel', 'record.json'))).toBeNull();
  });
});

describe('the stop (SPEC §4.2.6)', () => {
  it('is SIGINT, then SIGTERM, then SIGKILL, for a child that ignores the first two', async () => {
    let served = 'null';
    const w = world({
      exec: () => ({ stdout: served }),
      onSpawn: (c) => {
        c.endsOn = new Set();
        setImmediate(() => {
          served = servedJson(DOOR.localPort);
          c.out('Available on the internet:\n');
        });
      }
    });
    const outcome = await startFunnel(w.deps, DOOR, never);
    if (outcome.kind !== 'published') throw new Error('not published');
    expect(await outcome.run.stop()).toBe(true);
    expect(w.spawned[0]?.child.signals).toEqual(['SIGINT', 'SIGTERM', 'SIGKILL']);
    const waits = w.sleeps.map((s) => s.ms);
    expect(waits).toContain(2_000);
    expect(waits).toContain(1_000);
  });

  it('is SIGINT alone for a child that ends on it, and twice is once', async () => {
    let served = 'null';
    const w = world({
      exec: () => ({ stdout: served }),
      onSpawn: (c) =>
        setImmediate(() => {
          served = servedJson(DOOR.localPort);
          c.out('Available on the internet:\n');
        })
    });
    const outcome = await startFunnel(w.deps, DOOR, never);
    if (outcome.kind !== 'published') throw new Error('not published');
    await Promise.all([outcome.run.stop(), outcome.run.stop()]);
    expect(w.spawned[0]?.child.signals).toEqual(['SIGINT']);
  });

  it('keeps at most 64 KiB of a stream, and still reads every line for its cue', () => {
    const w = world();
    const child = new FakeChild(1234);
    const run = new funnel.FunnelRun(child as unknown as FunnelChild, w.deps, []);
    const lines: string[] = [];
    run.onLine((_stream, line) => lines.push(line));
    for (let i = 0; i < 2_000; i += 1) child.err(`${'y'.repeat(99)}\n`);
    child.err('the last line\n');
    expect(Buffer.byteLength(run.err.text(), 'utf8')).toBeLessThanOrEqual(FUNNEL_OUTPUT_CAP_BYTES);
    expect(run.err.kept.length).toBeGreaterThan(600);
    expect(lines).toHaveLength(2_001);
    expect(lines.at(-1)).toBe('the last line');
    // One line longer than the cap is cut, never grown without bound.
    child.out('z'.repeat(FUNNEL_OUTPUT_CAP_BYTES * 2));
    expect(lines.at(-1)?.length).toBe(FUNNEL_OUTPUT_CAP_BYTES);
    child.close(0);
  });
});

// ---------------------------------------------------------------------------
// The orphan (SPEC §4.2.6)
// ---------------------------------------------------------------------------

describe('the orphan sweep', () => {
  const RECORD = {
    pid: 777,
    lstart: 'Tue Sep 29 11:00:00 2026',
    command: 'node /stand/in/standin.mjs funnel --tcp=8443 --proxy-protocol=2 tcp://127.0.0.1:50000',
    argv: [PROGRAM, 'funnel'],
    at: 1
  };
  const path = (): string => join(dir, 'gmux', 'pocket-funnel', 'record.json');
  const plant = (): void => {
    funnel.writeFunnelRecord(path(), RECORD);
  };

  it('with no record asks ps NOTHING, so a person who never turned the door on spawns nothing', async () => {
    const w = world();
    expect(await sweepFunnelOrphan(w.deps)).toBe('none');
    expect(w.psCalls).toEqual([]);
    expect(w.pidKills).toEqual([]);
  });

  it('ends a process whose start time AND command both match, and deletes the record', async () => {
    plant();
    let alive = true;
    const w = world({
      ps: () => ({ lstart: RECORD.lstart, command: RECORD.command }),
      alive: () => alive,
      onPidSignal: (_pid, signal) => {
        if (signal === 'SIGINT') alive = false;
      }
    });
    expect(await sweepFunnelOrphan(w.deps)).toBe('ended');
    expect(w.pidKills.filter(([, s]) => s !== 0)).toEqual([[777, 'SIGINT']]);
    expect(readFunnelRecord(path())).toBeNull();
    expect(logged.some((l) => l.includes('ended a Funnel child a previous run left behind'))).toBe(true);
  });

  it('leaves a DECOY alone: the same command at another start time', async () => {
    plant();
    const w = world({
      ps: () => ({ lstart: 'Tue Sep 29 11:00:01 2026', command: RECORD.command }),
      alive: () => true
    });
    expect(await sweepFunnelOrphan(w.deps)).toBe('left-alone');
    expect(w.pidKills.filter(([, s]) => s !== 0)).toEqual([]);
    expect(readFunnelRecord(path())).toBeNull();
    expect(logged.some((l) => l.includes('left a process alone: it does not match the record'))).toBe(true);
  });

  it('leaves alone a process at the same start time with another command line', async () => {
    plant();
    const w = world({ ps: () => ({ lstart: RECORD.lstart, command: '/bin/zsh' }), alive: () => true });
    expect(await sweepFunnelOrphan(w.deps)).toBe('left-alone');
    expect(w.pidKills.filter(([, s]) => s !== 0)).toEqual([]);
  });

  it('leaves alone a process its record names that is no Funnel child, even when ps agrees with the record, and removes the record', async () => {
    // A record is a file on his disk. One naming a process Tortie never
    // spawns (here his own shell, whose start time and command ps would
    // confirm exactly) is no proof, so nothing is signalled and ps is not
    // even asked (the fix round after his ruling of 2026-09-29).
    const foreign = { ...RECORD, command: '/bin/zsh -l' };
    funnel.writeFunnelRecord(path(), foreign);
    const w = world({ ps: () => ({ lstart: foreign.lstart, command: foreign.command }), alive: () => true });
    expect(await sweepFunnelOrphan(w.deps)).toBe('left-alone');
    expect(w.psCalls).toEqual([]);
    expect(w.pidKills).toEqual([]);
    expect(readFunnelRecord(path())).toBeNull();
    expect(logged.some((l) => l.includes('left a process alone: its record names no Funnel child'))).toBe(true);
  });

  it('reads a record as a Funnel child only when its command ends in the argv Tortie spawns', () => {
    const argv = (pub: number, local: number): string => funnelArgv(pub, local).join(' ');
    // What ps prints for the children Tortie spawns: the stand-in after its
    // wrapper's exec, the wrapper before it, and the real CLI.
    expect(recordNamesFunnelChild(`node /r/build/p330/tailscale-standin.mjs ${argv(8443, 50000)}`)).toBe(true);
    expect(recordNamesFunnelChild(`/bin/sh /s/tailscale ${argv(10000, 1)}`)).toBe(true);
    expect(recordNamesFunnelChild(`/Applications/Tailscale.app/Contents/MacOS/Tailscale ${argv(8443, 65535)}`)).toBe(true);
    // Anything else is no child of Tortie's.
    for (const command of [
      '/bin/zsh -l',
      '',
      'funnel --tcp=8443 --proxy-protocol=2 tcp://127.0.0.1:50000',
      '/x/tailscale funnel --tcp=443 --proxy-protocol=2 tcp://127.0.0.1:50000',
      '/x/tailscale funnel --tcp=8443 tcp://127.0.0.1:50000',
      '/x/tailscale funnel --tcp=8443 --proxy-protocol=1 tcp://127.0.0.1:50000',
      '/x/tailscale funnel --tcp=8443 --proxy-protocol=2 tcp://0.0.0.0:50000',
      '/x/tailscale funnel --tcp=8443 --proxy-protocol=2 tcp://127.0.0.1:0',
      '/x/tailscale funnel --tcp=8443 --proxy-protocol=2 tcp://127.0.0.1:70000',
      '/x/tailscale funnel --tcp=8443 --proxy-protocol=2 tcp://127.0.0.1:50000 --bg',
      '/x/tailscale serve --tcp=8443 --proxy-protocol=2 tcp://127.0.0.1:50000',
      '/x/tailscale funnel --tcp=8443 --proxy-protocol=2 tcp://127.0.0.1:50000; rm -rf /'
    ]) {
      expect(recordNamesFunnelChild(command), command).toBe(false);
    }
  });

  it('forgets a record whose process is gone, signalling nothing', async () => {
    plant();
    const w = world({ ps: () => null });
    expect(await sweepFunnelOrphan(w.deps)).toBe('gone');
    expect(w.pidKills).toEqual([]);
    expect(readFunnelRecord(path())).toBeNull();
  });

  it('KEEPS the record of a matched process that outlived its SIGKILL', async () => {
    plant();
    const w = world({
      ps: () => ({ lstart: RECORD.lstart, command: RECORD.command }),
      alive: () => true
    });
    expect(await sweepFunnelOrphan(w.deps)).toBe('still-running');
    expect(w.pidKills.filter(([, s]) => s !== 0).map(([, s]) => s)).toEqual(['SIGINT', 'SIGTERM', 'SIGKILL']);
    expect(readFunnelRecord(path())).toEqual(RECORD);
  });

  it('reads a planted record that is not one as no record: launchd is never signalled', async () => {
    funnel.writeFunnelRecord(path(), { ...RECORD, pid: 1 });
    expect(readFileSync(path(), 'utf8')).toContain('"pid": 1');
    const w = world();
    expect(await sweepFunnelOrphan(w.deps)).toBe('none');
    expect(w.psCalls).toEqual([]);
    expect(w.pidKills).toEqual([]);
    expect(readFunnelRecord(path())).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The restart's spacing, and the quit (SPEC §4.2.7, §4.13)
// ---------------------------------------------------------------------------

describe('the restart and the quit', () => {
  it('spaces restarts from 2 s, doubling to 60 s and never beyond', () => {
    expect(FUNNEL_RESTART_FLOOR_MS).toBe(2_000);
    expect(FUNNEL_RESTART_CAP_MS).toBe(60_000);
    const seen: number[] = [];
    let d = 0;
    for (let i = 0; i < 8; i += 1) {
      d = nextRestartDelay(d);
      seen.push(d);
    }
    expect(seen).toEqual([2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000, 60_000]);
  });

  it('clears every restart timer at the quit’s first line, and starts nothing after it', async () => {
    const w = world({ holdFrom: 1 });
    let fired = 0;
    armFunnelRestart(w.deps, 2_000, () => {
      fired += 1;
    });
    beginFunnelShutdown();
    for (const s of w.sleeps) s.release();
    await settle();
    expect(fired).toBe(0);
    // And a restart armed AFTER the quit began never fires either.
    armFunnelRestart(w.deps, 2_000, () => {
      fired += 1;
    });
    for (const s of w.sleeps) s.release();
    await settle();
    expect(fired).toBe(0);
    expect(await startFunnel(w.deps, DOOR, never)).toEqual({ kind: 'superseded' });
    expect(w.spawned).toEqual([]);
  });

  it('fires a restart that was armed and not cleared (the control)', async () => {
    const w = world({ holdFrom: 1 });
    let fired = 0;
    armFunnelRestart(w.deps, 2_000, () => {
      fired += 1;
    });
    for (const s of w.sleeps) s.release();
    await settle();
    expect(fired).toBe(1);
  });

  // PHASE 332: the Mac's name check arms its timer here on its OWN clock, a
  // bare `{ sleep }`, and sits in the same set the quit's first line clears.
  describe('over a bare { sleep }, the name check’s own clock', () => {
    function bareSleep(): { deps: { sleep(ms: number): Promise<void> }; asked: number[]; release: () => void } {
      const held: (() => void)[] = [];
      const asked: number[] = [];
      return {
        deps: {
          sleep: (ms) =>
            new Promise<void>((resolve) => {
              asked.push(ms);
              held.push(resolve);
            })
        },
        asked,
        release: () => {
          for (const r of held.splice(0)) r();
        }
      };
    }

    it('sleeps the gap it was handed on that clock, and fires once', async () => {
      const bare = bareSleep();
      let fired = 0;
      armFunnelRestart(bare.deps, 45_000, () => {
        fired += 1;
      });
      expect(bare.asked).toEqual([45_000]);
      await settle();
      expect(fired).toBe(0);
      bare.release();
      await settle();
      expect(fired).toBe(1);
    });

    it('is cleared by its own cancel and by the quit, whichever comes first', async () => {
      const bare = bareSleep();
      let fired = 0;
      const cancel = armFunnelRestart(bare.deps, 20_000, () => {
        fired += 1;
      });
      cancel();
      armFunnelRestart(bare.deps, 30_000, () => {
        fired += 1;
      });
      beginFunnelShutdown();
      bare.release();
      await settle();
      expect(fired).toBe(0);
      // Armed after the quit began: nothing is even slept.
      armFunnelRestart(bare.deps, 60_000, () => {
        fired += 1;
      });
      expect(bare.asked).toEqual([20_000, 30_000]);
      bare.release();
      await settle();
      expect(fired).toBe(0);
    });
  });

  it('ends a start waiting on approval at the quit, and the join ends every child', async () => {
    const w = world({
      holdFrom: FUNNEL_START_DEADLINE_MS,
      onSpawn: (c) => setImmediate(() => c.out('         https://login.tailscale.com/f/funnel?node=nMADEUP\n'))
    });
    const started = startFunnel(w.deps, DOOR, never);
    await settle();
    const joined = await joinFunnel();
    expect(await started).toEqual({ kind: 'superseded' });
    expect(joined.children).toBe(1);
    expect(w.spawned[0]?.child.signals[0]).toBe('SIGINT');
  });

  it('joins a published child with SIGINT and removes its record', async () => {
    let served = 'null';
    const w = world({
      exec: () => ({ stdout: served }),
      onSpawn: (c) =>
        setImmediate(() => {
          served = servedJson(DOOR.localPort);
          c.out('Available on the internet:\n');
        })
    });
    const outcome = await startFunnel(w.deps, DOOR, never);
    expect(outcome.kind).toBe('published');
    const joined = await joinFunnel();
    expect(joined).toMatchObject({ children: 1, ended: 1 });
    expect(w.spawned[0]?.child.signals).toEqual(['SIGINT']);
    expect(readFunnelRecord(join(dir, 'gmux', 'pocket-funnel', 'record.json'))).toBeNull();
  });

  it('with no child, the join is nothing', async () => {
    expect(await joinFunnel()).toEqual({ children: 0, ended: 0, waitedMs: 0 });
  });

  it('servesThisDoor is the read-back’s one question', () => {
    const config = parseServeStatus(servedJson(51234)) ?? null;
    expect(servesThisDoor(config, { publicName: NAME, publicPort: 8443, localPort: 51234 })).toBe(true);
    expect(servesThisDoor(config, { publicName: NAME, publicPort: 8443, localPort: 51235 })).toBe(false);
    expect(servesThisDoor(config, { publicName: 'other.tail00000.ts.net', publicPort: 8443, localPort: 51234 })).toBe(false);
  });
});
