/**
 * The owner behind Settings then Phone (Phase 313, switched on in Phase 316).
 *
 * Two things are worth proving here that neither `./pairing.test.ts` nor
 * `./server.test.ts` can.
 *
 * THE ACKNOWLEDGEMENT IS SUPPLIED IN MAIN. The renderer hands over two things,
 * the lines it drew and the hash it drew them from, and nothing else — there is
 * no field on `PocketAllowInput` that could carry the sentence, so a renderer
 * cannot compose it, a file cannot hold it and a convenience path cannot pass
 * it through.
 *
 * THE DOOR'S LIFETIME (Phase 316): turn on → confirm → listening → pair, the
 * launch step that binds ONLY on confirmed fields, a door that closes when a
 * press moves a hashed field, and the tailnet key that reaches no file, no log
 * line and no answer but the one QR.
 *
 * NOTHING HERE BINDS A SOCKET. `./bind.ts` is replaced by a door made of
 * booleans that counts its starts and stops, so every order below is read off
 * those counts. The listener itself has its own tests in `./bind.test.ts`, and
 * the real bind on loopback is `probe:p313`'s.
 */

import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createCipheriv,
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes
} from 'node:crypto';
import { createServer, request as httpRequest } from 'node:http';
import type { IpcMain } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Project, Session } from '@shared/types';
import type { PocketFacts } from '../routes';

let userData = '';
let keystore = true;
/**
 * False makes every SEAL fail while opening still works (the Phase 316.1 fix
 * round): a store that can be read and cannot be written, which is the one
 * state where only the in-memory switch count stops a start.
 */
let sealWrites = true;

const MARKER = '--tortie-pocket-ipc-test--';

/** Every event main pushed to a window, as JSON, in order. */
const sent: string[] = [];
/** Every log line any module wrote, message and fields, as JSON. */
const logged: string[] = [];

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true, isPackaged: false },
  BrowserWindow: {
    getAllWindows: () => [
      {
        isDestroyed: () => false,
        webContents: {
          send: (channel: string, ...payload: unknown[]) => {
            sent.push(JSON.stringify([channel, ...payload]));
          }
        }
      }
    ]
  },
  ipcMain: { handle: () => undefined },
  safeStorage: {
    isEncryptionAvailable: () => keystore,
    encryptString: (text: string) => {
      if (!sealWrites) throw new Error('p316-ipc: the seal refused this write');
      return Buffer.from(`${MARKER}${text}`, 'utf8');
    },
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const capture =
    (level: string) =>
    (msg: string, fields?: Record<string, unknown>): void => {
      logged.push(JSON.stringify([level, msg, fields ?? null]));
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

// The registrar's own sender check is `../typed-ipc.ts`'s and is tested there.
// Here every sender is Tortie's, so the handlers can be called.
vi.mock('../../security/trusted-window', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../security/trusted-window')>();
  return { ...real, assertTrustedIpcSender: () => undefined };
});

/**
 * The door, as booleans. `publicKey` is the colon hex `./tls.ts` hands out;
 * `certificate` is a DIFFERENT hash on purpose, so a window that pinned the
 * certificate would be caught.
 */
const door = {
  listening: false,
  quitting: false,
  starts: 0,
  stops: 0,
  order: [] as string[],
  /**
   * Held open, a start waits here before it listens, the way the real listen
   * is the one await in `./bind.ts`'s start (the Phase 316.1 fix round).
   */
  opening: null as Promise<void> | null,
  publicKey: colonHex(createHash('sha256').update('p316-ipc-door-spki').digest()),
  certificate: colonHex(createHash('sha256').update('p316-ipc-door-cert').digest())
};

function colonHex(buf: Buffer): string {
  return (buf.toString('hex').toUpperCase().match(/.{2}/g) ?? []).join(':');
}

vi.mock('../bind', async (importOriginal) => {
  const real = await importOriginal<typeof import('../bind')>();
  return {
    ...real,
    pocketDoorStatus: () => ({
      listening: door.listening,
      address: door.listening ? '127.0.0.1' : null,
      port: door.listening ? 8823 : 0,
      certificateFingerprint: door.listening ? door.certificate : null,
      publicKeyFingerprint: door.listening ? door.publicKey : null,
      shortFingerprint: null,
      selfOriginRefused: false,
      lastRefusal: null,
      sentence: null
    }),
    // This Mac's tailnet address, as the chooser answers it. Faked, so no test
    // reads the machine's real interfaces and every host below agrees with it.
    chooseTailnetAddress: () => ({
      address: '100.64.0.1',
      interfaceName: 'utun-p316',
      netmask: '255.255.255.255',
      hasTailnetUla: true
    }),
    pocketShutdownStarted: () => door.quitting,
    startPocketDoor: async () => {
      door.order.push('start');
      if (door.opening !== null) await door.opening;
      if (door.quitting) {
        return { ok: false, reason: 'quitting', sentence: real.DOOR_SENTENCES.quitting };
      }
      door.starts += 1;
      door.listening = true;
      return {
        ok: true,
        address: '127.0.0.1',
        port: 8823,
        certificateFingerprint: door.certificate,
        publicKeyFingerprint: door.publicKey,
        shortFingerprint: 'AAAA BBBB CCCC',
        selfOriginRefused: false
      };
    },
    stopPocketDoor: async () => {
      door.order.push('stop');
      door.stops += 1;
      door.listening = false;
      return { accepted: 0, joined: true, waitedMs: 0 };
    }
  };
});

const { PocketHost, POCKET_DEFAULT_PORT, pocketFieldAddress, registerPocketIpc } = await import(
  '../ipc'
);
const {
  POCKET_CONFIRM_ACKNOWLEDGEMENT,
  POCKET_HEADERS,
  POCKET_PAIRING_WINDOW_MS,
  confirmPocketDoor,
  phoneIdOf,
  pocketConfirmStatus,
  readPocketStore,
  sealPresentationAsPhone,
  signAsPhone,
  writePocketStore
} = await import('../pairing');
const { HARNESS_LOOPBACK_ENV } = await import('../bind');
const { POCKET_ROUTE_IDS, POCKET_CONFIRM_WARNING, pocketGrantText } = await import(
  '@shared/ipc/pocket'
);

const SESSIONS: Session[] = [];
const PROJECTS: Project[] = [];

const FACTS: PocketFacts = {
  sessions: () => SESSIONS,
  projects: () => PROJECTS,
  blockedSince: () => new Map(),
  activity: () => undefined,
  statusWord: () => ({ dot: 'idle', label: 'idle' }),
  agentLabel: (id) => id,
  machineLabel: () => null,
  emptyLine: 'Nothing needs you',
  wakes: () => [],
  catchUp: async () => null,
  lastTurn: async () => ({ answerText: null, turnCount: 0 }),
  turns: async () => ({ turns: [], more: false }),
  handoff: () => null
};

/**
 * A MADE-UP tailnet auth key. No real key exists in this repository and none
 * may: this string is Tortie-shaped and reaches no tailnet.
 */
const FAKE_KEY = 'tskey-auth-kP316IPC1CNTRL-p316notarealkeyp316notarealkey';

const NO_KEY = { tailnetKey: null };

let clock = 10_000_000;

function host(beforeOpen?: () => Promise<unknown>): InstanceType<typeof PocketHost> {
  return new PocketHost({
    facts: FACTS,
    bindAddress: () => '100.64.0.1',
    now: () => clock,
    ...(beforeOpen !== undefined ? { beforeOpen } : {})
  });
}

function b64u(buf: Buffer): string {
  return buf.toString('base64url');
}

/** A phone's sealed presentation, spelled here from the wire format. */
function present(
  secretB64u: string,
  label: string,
  push: Record<string, unknown> = {}
): Buffer {
  const ed = generateKeyPairSync('ed25519');
  const x = generateKeyPairSync('x25519');
  const key = Buffer.from(
    hkdfSync(
      'sha256',
      Buffer.from(secretB64u, 'base64url'),
      Buffer.alloc(0),
      'tortie-pocket-pair-v1',
      32
    )
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plain = JSON.stringify({
    label,
    ek: b64u(ed.publicKey.export({ format: 'der', type: 'spki' })),
    xk: b64u(x.publicKey.export({ format: 'der', type: 'spki' })),
    ...push
  });
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.from(
    JSON.stringify({ iv: b64u(iv), ct: b64u(ct), tag: b64u(cipher.getAuthTag()) }),
    'utf8'
  );
}

/** The person's switch and confirm, through the sheet's own answers. */
async function turnOnAndConfirm(one: InstanceType<typeof PocketHost>): Promise<void> {
  const on = await one.setDoor({ on: true });
  await one.confirmDoor({ linesRead: on.confirmLines, hashRead: on.confirmHash });
}

/** A host whose door is on, confirmed and listening, as the sheet leaves it. */
async function listeningHost(): Promise<InstanceType<typeof PocketHost>> {
  const one = host();
  await turnOnAndConfirm(one);
  expect(one.status().state).toBe('listening');
  return one;
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p316-ipc-'));
  keystore = true;
  sealWrites = true;
  clock = 10_000_000;
  door.opening = null;
  door.listening = false;
  door.quitting = false;
  door.starts = 0;
  door.stops = 0;
  door.order = [];
  sent.length = 0;
  logged.length = 0;
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

describe('the status the sheet draws', () => {
  it('is off, unconfirmed, with no phone, before anything happens', () => {
    const status = host().status();
    expect(status.state).toBe('off');
    expect(status.confirmState).toBe('never');
    expect(status.phones).toEqual([]);
    expect(status.port).toBe(POCKET_DEFAULT_PORT);
    expect(status.address).toBe('100.64.0.1');
    expect(status.refusal).not.toBeNull();
    expect(status.routes).toEqual(POCKET_ROUTE_IDS);
  });

  it('says there is no address when this Mac has none, and draws no grant', () => {
    const status = new PocketHost({
      facts: FACTS,
      bindAddress: () => ''
    }).status();
    expect(status.address).toBeNull();
    expect(status.grant).toBeNull();
  });

  it('draws the grant as text, naming the door and never a credential', () => {
    const text = host().grantText();
    expect(text).toContain('tag:tortie-phone');
    expect(text).toContain('100.64.0.1');
    expect(text).toContain(`tcp:${String(POCKET_DEFAULT_PORT)}`);
    // Tortie holds no Tailscale credential, so the text can name none.
    expect(text.toLowerCase()).not.toContain('tskey');
    expect(text.toLowerCase()).not.toContain('client_secret');
    expect(text).not.toContain('policy_file');
  });

  it('carries the grant for the bound address in the status (Phase 316)', () => {
    const status = host().status();
    expect(status.grant).toBe(pocketGrantText('100.64.0.1', POCKET_DEFAULT_PORT));
    expect(status.grant).toBe(host().grantText());
  });

  it('carries the confirm lines and the hash they were drawn from', () => {
    const one = host();
    const status = one.status();
    const gate = pocketConfirmStatus(one.fields());
    expect(status.confirmLines).toEqual(gate.lines);
    expect(status.confirmHash).toBe(gate.hash);
    expect(status.confirmLines.length).toBeGreaterThan(0);
  });
});

describe('the confirmed field names the address that binds', () => {
  const before = process.env[HARNESS_LOOPBACK_ENV];
  afterEach(() => {
    if (before === undefined) delete process.env[HARNESS_LOOPBACK_ENV];
    else process.env[HARNESS_LOOPBACK_ENV] = before;
  });

  it('is loopback under the harness override, so the field and the bind agree', () => {
    process.env[HARNESS_LOOPBACK_ENV] = '1';
    expect(pocketFieldAddress()).toBe('127.0.0.1');
    const one = new PocketHost({ facts: FACTS });
    expect(one.fields().bindAddress).toBe('127.0.0.1');
  });

  it('is never loopback without it', () => {
    delete process.env[HARNESS_LOOPBACK_ENV];
    expect(pocketFieldAddress()).toBe('100.64.0.1');
  });

  it('refuses to bind when the confirmed address is not the one the bind would take', async () => {
    // An owner that CONFIRMS loopback, with no loopback override: the bind
    // would take this Mac's tailnet address instead. It must not open.
    delete process.env[HARNESS_LOOPBACK_ENV];
    const one = new PocketHost({ facts: FACTS, bindAddress: () => '127.0.0.1' });
    const on = await one.setDoor({ on: true });
    const result = await one.confirmDoor({
      linesRead: on.confirmLines,
      hashRead: on.confirmHash
    });
    expect(result.status.confirmState).toBe('confirmed');
    expect(door.starts).toBe(0);
    expect(result.status.state).toBe('refused');
    expect(result.status.refusal).toMatch(/another address than the one it would answer on/);
  });
});

// ---------------------------------------------------------------------------
// Phase 316: turn on → confirm → listening
// ---------------------------------------------------------------------------

describe('switching the door on', () => {
  it('writes enabled and bindAtLaunch together, and opens NOTHING before the confirm', async () => {
    const one = host();
    const on = await one.setDoor({ on: true });
    expect(door.starts).toBe(0);
    expect(door.listening).toBe(false);
    expect(on.state).toBe('refused');
    expect(on.bindAtLaunch).toBe(true);
    expect(on.confirmState).toBe('never');
    expect(on.confirmLines).toContain('Starts answering when Tortie starts');
    const store = readPocketStore().store;
    expect(store?.enabled).toBe(true);
    expect(store?.bindAtLaunch).toBe(true);
  });

  it('opens the door on the confirm, and only then', async () => {
    const one = host();
    const on = await one.setDoor({ on: true });
    const confirmed = await one.confirmDoor({
      linesRead: on.confirmLines,
      hashRead: on.confirmHash
    });
    expect(confirmed.allowed).toBe(true);
    expect(door.starts).toBe(1);
    expect(confirmed.status.state).toBe('listening');
    expect(confirmed.status.refusal).toBeNull();
  });

  it('records a confirm on a door that is switched off, and opens nothing', async () => {
    const one = host();
    const gate = pocketConfirmStatus(one.fields());
    const result = await one.confirmDoor({ linesRead: gate.lines, hashRead: gate.hash });
    expect(result.allowed).toBe(true);
    expect(result.status.confirmState).toBe('confirmed');
    expect(door.starts).toBe(0);
    expect(result.status.state).toBe('off');
  });

  it('refuses a confirm drawn for other fields, and opens nothing', async () => {
    const one = host();
    const stale = one.status();
    await one.setDoor({ on: true });
    await expect(
      one.confirmDoor({ linesRead: stale.confirmLines, hashRead: stale.confirmHash })
    ).rejects.toThrow();
    expect(door.starts).toBe(0);
  });

  it('refuses during a quit and writes nothing', async () => {
    const one = host();
    door.quitting = true;
    await expect(one.setDoor({ on: true })).rejects.toThrow(/quitting/);
    expect(readPocketStore().store?.enabled ?? false).toBe(false);
    expect(door.starts).toBe(0);
  });

  it('refuses anything that is not a switch, and writes nothing', async () => {
    const one = host();
    for (const bad of [null, {}, { on: 'yes' }, { on: 1 }, 'on']) {
      await expect(one.setDoor(bad as unknown as { on: boolean })).rejects.toThrow(
        /could not read that switch/
      );
    }
    expect(readPocketStore().store).toBeNull();
    expect(door.starts).toBe(0);
  });
});

describe('switching the door off', () => {
  it('writes both fields false before its first await, then stops the door (the Phase 316.1 fix round)', async () => {
    const one = await listeningHost();
    const pending = one.setDoor({ on: false });
    // Nothing has been awaited yet, and the store already says off.
    expect(readPocketStore().store?.enabled).toBe(false);
    expect(readPocketStore().store?.bindAtLaunch).toBe(false);
    const off = await pending;
    expect(door.order.at(-1)).toBe('stop');
    expect(door.listening).toBe(false);
    expect(off.state).toBe('off');
    const store = readPocketStore().store;
    expect(store?.enabled).toBe(false);
    expect(store?.bindAtLaunch).toBe(false);
  });

  it('stops the door even when the switch cannot be saved, and says so', async () => {
    const one = await listeningHost();
    keystore = false;
    await expect(one.setDoor({ on: false })).rejects.toThrow(/door is closed/);
    keystore = true;
    expect(door.listening).toBe(false);
  });

  it('shuts an open pairing window with it, and the key it held', async () => {
    const one = await listeningHost();
    one.beginPairing({ tailnetKey: FAKE_KEY });
    expect(one.pairing.holdsTailnetKey()).toBe(true);
    await one.setDoor({ on: false });
    expect(one.pairing.windowOpen()).toBe(false);
    expect(one.pairing.holdsTailnetKey()).toBe(false);
  });

  it('opens the agreed door again at once when nothing else moved', async () => {
    const one = await listeningHost();
    await one.setDoor({ on: false });
    expect(door.starts).toBe(1);
    const again = await one.setDoor({ on: true });
    // The same fields a person confirmed before: the switch opens it.
    expect(again.confirmState).toBe('confirmed');
    expect(door.starts).toBe(2);
    expect(again.state).toBe('listening');
  });

  // THE PHASE 316.1 FIX ROUND, the attack's X1. A switch-on waiting on the
  // sessions and a switch-off in the same turn: the off used to stop first and
  // write after, the on re-read the switch inside that stop, found it on, and
  // bound a door the sheet then called off.
  it('binds nothing when the switch goes off in the same turn a switch-on waits on the sessions', async () => {
    let gate: Promise<void> = Promise.resolve();
    const one = host(() => gate);
    await turnOnAndConfirm(one);
    await one.setDoor({ on: false });
    const starts = door.starts;
    let release = (): void => undefined;
    gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const on = one.setDoor({ on: true });
    const off = one.setDoor({ on: false });
    release();
    await Promise.all([on, off]);
    expect(door.starts).toBe(starts);
    expect(door.listening).toBe(false);
    expect(readPocketStore().store?.enabled).toBe(false);
    expect(one.status().state).toBe('off');
  });

  it('binds nothing for a start already past its gate when the off could not be saved', async () => {
    let gate: Promise<void> = Promise.resolve();
    const one = host(() => gate);
    await turnOnAndConfirm(one);
    await one.setDoor({ on: false });
    const starts = door.starts;
    let release = (): void => undefined;
    gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const on = one.setDoor({ on: true });
    // The store can be read and not written: it still says ON after the off,
    // so only the switch count stands between the start and the bind.
    sealWrites = false;
    const off = one.setDoor({ on: false });
    release();
    await on;
    await expect(off).rejects.toThrow(/door is closed/);
    sealWrites = true;
    expect(door.starts).toBe(starts);
    expect(door.listening).toBe(false);
  });

  it('closes a door that opened while a press withdrew the agreement', async () => {
    const one = await listeningHost();
    await one.setDoor({ on: false });
    let release = (): void => undefined;
    door.opening = new Promise<void>((resolve) => {
      release = resolve;
    });
    const on = one.setDoor({ on: true });
    // Inside the listen: the alerts flip moves a hashed field, and there is no
    // listening door yet for its own close to find. Its close waits its turn
    // behind the start (the switch's one queue, Phase 316.1), so it is not
    // awaited until the listen is released.
    await vi.waitFor(() => expect(door.order.at(-1)).toBe('start'));
    const flip = one.setPushAlerts(true);
    release();
    const after = await on;
    await flip;
    expect(door.listening).toBe(false);
    expect(after.state).toBe('refused');
    expect(after.confirmState).not.toBe('confirmed');
  });
});

// ---------------------------------------------------------------------------
// Phase 316: the launch step (L1)
// ---------------------------------------------------------------------------

describe('the launch step binds only on confirmed fields', () => {
  it('opens the door with no press when the person left it on and confirmed', async () => {
    await listeningHost();
    door.listening = false;
    const starts = door.starts;
    // A relaunch: a fresh owner over the same sealed files.
    const relaunched = host(async () => {
      door.order.push('ready');
    });
    const outcome = await relaunched.openAtLaunch();
    expect(outcome).toBe('opened');
    expect(door.starts).toBe(starts + 1);
    // The core is waited for BEFORE the door answers anything.
    expect(door.order.slice(-2)).toEqual(['ready', 'start']);
    expect(relaunched.status().state).toBe('listening');
  });

  it('does nothing at all for a door nobody turned on, and waits for nothing', async () => {
    const calls: string[] = [];
    const outcome = await host(async () => {
      calls.push('ready');
    }).openAtLaunch();
    expect(outcome).toBe('off');
    expect(calls).toEqual([]);
    expect(door.starts).toBe(0);
  });

  it('stays shut, and says why, for bindAtLaunch written with no confirm', async () => {
    // What a hostile writer with the seal would leave: the switch on, and no
    // agreement on record.
    const one = host();
    one.status();
    const minted = await one.setDoor({ on: true });
    expect(minted.confirmState).toBe('never');
    const calls: string[] = [];
    const relaunched = host(async () => {
      calls.push('ready');
    });
    const outcome = await relaunched.openAtLaunch();
    expect(outcome).toBe('refused');
    expect(door.starts).toBe(0);
    expect(calls).toEqual([]);
    const status = relaunched.status();
    expect(status.state).toBe('refused');
    expect(status.refusal).toMatch(/nobody has confirmed this door/);
    expect(logged.some((l) => l.includes('stayed shut at launch'))).toBe(true);
  });

  it('stays shut when the store was edited AFTER a confirm (the hash moved)', async () => {
    const one = host();
    // A door that was on and then switched off, so the store exists with both
    // switches false; then confirmed as it stands, bindAtLaunch OFF.
    await one.setDoor({ on: true });
    await one.setDoor({ on: false });
    const gate = pocketConfirmStatus(one.fields());
    await one.confirmDoor({ linesRead: gate.lines, hashRead: gate.hash });
    const store = readPocketStore().store;
    if (store === null) throw new Error('no store');
    // The edit: both switches on, with no confirm of the new fields.
    writePocketStore({ ...store, enabled: true, bindAtLaunch: true });
    const relaunched = host();
    expect(await relaunched.openAtLaunch()).toBe('refused');
    expect(door.starts).toBe(0);
    expect(relaunched.status().confirmState).toBe('changed');
    expect(relaunched.status().refusal).toMatch(/changed after you confirmed it/);
  });

  it('does not open a door that is enabled but not asked for at launch', async () => {
    const one = host();
    one.status();
    await one.setDoor({ on: true });
    const store = readPocketStore().store;
    if (store === null) throw new Error('no store');
    const edited = { ...store, enabled: true, bindAtLaunch: false };
    writePocketStore(edited);
    // Even with these exact fields confirmed.
    confirmPocketDoor(host().fields(), {
      acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT,
      linesRead: [],
      hashRead: pocketConfirmStatus(host().fields()).hash
    });
    expect(pocketConfirmStatus(host().fields()).state).toBe('confirmed');
    expect(await host().openAtLaunch()).toBe('off');
    expect(door.starts).toBe(0);
  });

  it('says it stayed shut when the core never came up', async () => {
    await listeningHost();
    door.listening = false;
    const starts = door.starts;
    const relaunched = host(async () => {
      throw new Error('the core did not start');
    });
    expect(await relaunched.openAtLaunch()).toBe('refused');
    expect(door.starts).toBe(starts);
    expect(relaunched.status().refusal).toMatch(/could not start its sessions/);
    // The log line names no error text, only that the sessions were not up.
    expect(logged.some((l) => l.includes('the core did not start'))).toBe(false);
  });

  it('opens nothing when the switch goes off while the sessions come up', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const one = host(() => gate);
    const on = await one.setDoor({ on: true });
    const confirming = one.confirmDoor({
      linesRead: on.confirmLines,
      hashRead: on.confirmHash
    });
    // The confirm is waiting on the sessions; the person switches it off.
    await Promise.resolve();
    await one.setDoor({ on: false });
    release();
    await confirming;
    expect(door.starts).toBe(0);
    expect(door.listening).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The person is asked last
// ---------------------------------------------------------------------------

describe('the person is asked last, and main supplies the sentence', () => {
  it('has no field a renderer could put the acknowledgement in', async () => {
    const one = await listeningHost();
    const offer = one.beginPairing(NO_KEY);
    const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
    one.pairing.present(present(secret, 'Greg iPhone'), '100.64.0.9');
    const view = one.pairing.view();
    expect(view.state).toBe('presented');
    expect(view.warning).toBe(POCKET_CONFIRM_WARNING);
    // The renderer's whole input: the lines it drew and the hash it drew them
    // from. Nothing else crosses, and the sentence is added in main.
    const result = one.allowPhone({
      linesRead: view.lines,
      hashRead: view.hash ?? ''
    });
    expect(result.allowed).toBe(true);
    expect(result.status.phones.map((p) => p.label)).toEqual(['Greg iPhone']);
    expect(result.status.confirmState).toBe('confirmed');
    // The door that was listening is still listening: the allow confirmed the
    // new fields in the same press.
    expect(result.status.state).toBe('listening');
    // And the sentence main supplies is the module's own literal.
    expect(POCKET_CONFIRM_ACKNOWLEDGEMENT).toBe(
      'a person read what this door will answer and allowed it'
    );
  });

  it('refuses an allow whose hash is not the one the sheet drew', async () => {
    const one = await listeningHost();
    const offer = one.beginPairing(NO_KEY);
    const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
    one.pairing.present(present(secret, 'Greg iPhone'), '100.64.0.9');
    expect(() =>
      one.allowPhone({ linesRead: [], hashRead: 'deadbeef' })
    ).toThrow();
    expect(one.status().phones).toEqual([]);
  });

  it('refuses an allow with no phone in front of the person', () => {
    const one = host();
    const result = one.allowPhone({ linesRead: [], hashRead: '' });
    expect(result.allowed).toBe(false);
    expect(result.refusal).not.toBeNull();
  });

  it('carries the fingerprint the person matches on both screens', async () => {
    const one = await listeningHost();
    const offer = one.beginPairing(NO_KEY);
    const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
    one.pairing.present(present(secret, 'Greg iPhone'), '100.64.0.9');
    const view = one.pairing.view();
    one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' });
    expect(one.status().phones[0]?.fingerprint).toBe(view.fingerprint);
  });
});

// ---------------------------------------------------------------------------
// Phase 316: QR v:2 through the owner
// ---------------------------------------------------------------------------

describe('a pairing window opens only on a listening door', () => {
  it('refuses while the door is off, and opens no window', () => {
    const one = host();
    expect(() => one.beginPairing(NO_KEY)).toThrow(/not listening/);
    expect(one.pairing.windowOpen()).toBe(false);
  });

  it('refuses while the door is on but not yet confirmed', async () => {
    const one = host();
    await one.setDoor({ on: true });
    expect(() => one.beginPairing({ tailnetKey: FAKE_KEY })).toThrow(/not listening/);
    expect(one.pairing.windowOpen()).toBe(false);
    expect(one.pairing.holdsTailnetKey()).toBe(false);
  });

  it('pins the listening door’s PUBLIC KEY, base64url, and never its certificate', async () => {
    const one = await listeningHost();
    const payload = JSON.parse(one.beginPairing(NO_KEY).payload) as Record<string, unknown>;
    const spki = Buffer.from(door.publicKey.replace(/:/g, ''), 'hex');
    const cert = Buffer.from(door.certificate.replace(/:/g, ''), 'hex');
    expect(payload['v']).toBe(2);
    expect(payload['fp']).toBe(spki.toString('base64url'));
    expect(payload['fp']).not.toBe(cert.toString('base64url'));
    expect(payload['fp']).not.toBeNull();
    expect(payload['host']).toBe('100.64.0.1');
    expect(payload['port']).toBe(POCKET_DEFAULT_PORT);
  });
});

describe('the tailnet key reaches no file, no log and no answer but the QR (K1)', () => {
  function everyFileUnder(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) out.push(...everyFileUnder(path));
      else out.push(path);
    }
    return out;
  }

  /** The text, and every base64 run inside it decoded, twice over. */
  function readableForms(text: string): string[] {
    const out = [text];
    for (let depth = 0; depth < 2; depth += 1) {
      const found: string[] = [];
      for (const one of out) {
        for (const run of one.match(/[A-Za-z0-9+/=_-]{16,}/g) ?? []) {
          found.push(
            Buffer.from(run, /[-_]/.test(run) ? 'base64url' : 'base64').toString('utf8')
          );
        }
      }
      out.push(...found);
    }
    return out;
  }

  it('crosses once, inside the offer the QR is drawn from, and nowhere else', async () => {
    const one = await listeningHost();
    const answers: unknown[] = [];
    const offer = one.beginPairing({ tailnetKey: FAKE_KEY });
    // THE ONE PLACE: the QR's own bytes.
    expect((JSON.parse(offer.payload) as { tk?: string }).tk).toBe(FAKE_KEY);
    answers.push(one.status(), one.pairing.view());
    const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
    one.pairing.present(present(secret, 'Greg iPhone', {}), '100.64.0.9');
    const view = one.pairing.view();
    answers.push(view);
    const allowed = one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' });
    answers.push(allowed, one.status(), one.cancelPairing());
    answers.push(await one.setPushAlerts(true));
    const now = one.status();
    answers.push(await one.confirmDoor({ linesRead: now.confirmLines, hashRead: now.confirmHash }));
    answers.push(await one.removePhone(one.status().phones[0]?.id ?? ''));
    answers.push(await one.setDoor({ on: false }));
    answers.push(await one.forgetDoor());
    for (const answer of answers) {
      expect(JSON.stringify(answer)).not.toContain(FAKE_KEY);
    }
    // Every event main pushed to a window.
    expect(sent.length).toBeGreaterThan(0);
    for (const event of sent) expect(event).not.toContain(FAKE_KEY);
    // Every log line any module wrote.
    for (const line of logged) expect(line).not.toContain(FAKE_KEY);
    // Every file under userData, sealed or not.
    const files = everyFileUnder(userData);
    expect(files.some((f) => f.endsWith('pocket.json'))).toBe(true);
    for (const path of files) {
      for (const text of readableForms(readFileSync(path, 'utf8'))) {
        expect(text).not.toContain(FAKE_KEY);
      }
    }
  });

  it('is refused with a sentence that never repeats it, and a 10 KB key logs nothing', async () => {
    const one = await listeningHost();
    const huge = `tskey-auth-${'k'.repeat(10 * 1024)}`;
    expect(() => one.beginPairing({ tailnetKey: huge })).toThrow(/longer than any/);
    expect(() => one.beginPairing({ tailnetKey: 'not-a-key-p316' })).toThrow(
      /not a tailnet auth key/
    );
    for (const line of [...logged, ...sent]) {
      expect(line).not.toContain('kkkkkkkkkk');
      expect(line).not.toContain('not-a-key-p316');
    }
    expect(one.pairing.windowOpen()).toBe(false);
  });

  it('is dropped when the window expires', async () => {
    const one = await listeningHost();
    one.beginPairing({ tailnetKey: FAKE_KEY });
    expect(one.pairing.holdsTailnetKey()).toBe(true);
    clock += POCKET_PAIRING_WINDOW_MS + 1;
    // Asked FIRST, before anything else sweeps the window: the answer is the
    // deadline's, not whoever happened to look last.
    expect(one.pairing.holdsTailnetKey()).toBe(false);
    expect(one.pairing.windowOpen()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Removing a phone, and the door that closes with it
// ---------------------------------------------------------------------------

describe('removing a phone', () => {
  async function withOnePhone(): Promise<{
    one: InstanceType<typeof PocketHost>;
    phoneId: string;
  }> {
    const one = await listeningHost();
    const offer = one.beginPairing(NO_KEY);
    const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
    one.pairing.present(present(secret, 'Greg iPhone'), '100.64.0.9');
    const view = one.pairing.view();
    one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' });
    const phoneId = one.status().phones[0]?.id ?? '';
    return { one, phoneId };
  }

  it('drops it and withdraws the agreement with it', async () => {
    const { one, phoneId } = await withOnePhone();
    expect(one.status().confirmState).toBe('confirmed');
    const after = await one.removePhone(phoneId);
    expect(after.phones).toEqual([]);
    // A removed phone is not a phone whose approval is still on record.
    expect(after.confirmState).toBe('never');
    expect(pocketConfirmStatus(one.fields()).state).toBe('never');
  });

  it('closes the listening door until the person confirms again', async () => {
    const { one, phoneId } = await withOnePhone();
    const stops = door.stops;
    const after = await one.removePhone(phoneId);
    expect(door.stops).toBe(stops + 1);
    expect(after.state).toBe('refused');
    // The sheet has what it needs to ask, and the confirm reopens it.
    const again = await one.confirmDoor({
      linesRead: after.confirmLines,
      hashRead: after.confirmHash
    });
    expect(again.status.state).toBe('listening');
  });

  it('changes nothing for an id nobody has', async () => {
    const { one } = await withOnePhone();
    const before = one.status();
    const stops = door.stops;
    const after = await one.removePhone('not-a-phone');
    expect(after.phones).toEqual(before.phones);
    expect(after.confirmState).toBe('confirmed');
    expect(door.stops).toBe(stops);
    expect(after.state).toBe('listening');
  });

  // THE PHASE 316.1 FIX ROUND, the attack's R1, through the SHIPPING owner:
  // its own handler, verifier and store, and the phone's half spelled here.
  describe('while the phone’s request is in flight', () => {
    const SESSION = {
      id: 's-held',
      name: 'held',
      tmuxName: 'held',
      projectPath: '/w/held',
      cwd: '/w/held',
      agent: 'claude',
      status: 'idle',
      createdAt: 1
    } as Session;

    async function heldOwner(): Promise<{
      one: InstanceType<typeof PocketHost>;
      held: { gate: Promise<void> | null; reached: number };
      ask: (target: string) => Promise<number>;
      phoneId: string;
      stop: () => Promise<void>;
    }> {
      const held = { gate: null as Promise<void> | null, reached: 0 };
      const one = new PocketHost({
        facts: {
          ...FACTS,
          sessions: () => [SESSION],
          // Where the shipping composer awaits before it reads the store.
          refresh: async () => {
            held.reached += 1;
            if (held.gate !== null) await held.gate;
            return null;
          }
        },
        bindAddress: () => '100.64.0.1',
        now: () => clock
      });
      await turnOnAndConfirm(one);
      const offer = one.beginPairing(NO_KEY);
      const ed = generateKeyPairSync('ed25519');
      const x = generateKeyPairSync('x25519');
      const signingKey = b64u(ed.publicKey.export({ format: 'der', type: 'spki' }));
      const exchangeKey = b64u(x.publicKey.export({ format: 'der', type: 'spki' }));
      one.pairing.present(
        sealPresentationAsPhone(offer.payload, { label: 'Held iPhone', signingKey, exchangeKey }),
        '127.0.0.1'
      );
      const view = one.pairing.view();
      expect(one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' }).allowed).toBe(true);
      // The binding, derived from the PHONE's side.
      const dx = String((JSON.parse(offer.payload) as { dx: string }).dx);
      const shared = diffieHellman({
        privateKey: x.privateKey,
        publicKey: createPublicKey({ key: Buffer.from(dx, 'base64url'), format: 'der', type: 'spki' })
      });
      const binding = Buffer.from(
        hkdfSync('sha256', shared, Buffer.from(`${dx}\n${exchangeKey}`, 'utf8'), 'tortie-pocket-bind-v1', 32)
      ).toString('hex');
      const phoneId = phoneIdOf(signingKey);
      const server = createServer((req, res) => {
        void one.handler(req, res);
      });
      const port = await new Promise<number>((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve((server.address() as { port: number }).port));
      });
      const ask = (target: string): Promise<number> =>
        new Promise((resolve, reject) => {
          const timestamp = String(clock);
          const nonce = randomBytes(12).toString('hex');
          const req = httpRequest(
            {
              host: '127.0.0.1',
              port,
              path: target,
              method: 'GET',
              agent: false,
              headers: {
                host: '127.0.0.1:8823',
                [POCKET_HEADERS.phone]: phoneId,
                [POCKET_HEADERS.timestamp]: timestamp,
                [POCKET_HEADERS.nonce]: nonce,
                [POCKET_HEADERS.signature]: signAsPhone(ed.privateKey, {
                  method: 'GET',
                  target,
                  bodySha256: createHash('sha256').update(Buffer.alloc(0)).digest('hex'),
                  timestamp,
                  nonce,
                  binding
                })
              }
            },
            (res) => {
              res.resume();
              res.on('end', () => resolve(res.statusCode ?? 0));
            }
          );
          req.on('error', reject);
          req.end();
        });
      const stop = (): Promise<void> =>
        new Promise<void>((resolve) => {
          server.closeAllConnections?.();
          server.close(() => resolve());
        });
      return { one, held, ask, phoneId, stop };
    }

    it('answers the paired phone when nothing changed (the control)', async () => {
      const { held, ask, stop } = await heldOwner();
      try {
        let release = (): void => undefined;
        held.gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        const inFlight = ask(`/v1/session?id=${SESSION.id}`);
        await vi.waitFor(() => expect(held.reached).toBe(1));
        release();
        expect(await inFlight).toBe(200);
      } finally {
        await stop();
      }
    });

    it('refuses it, unpaired, when the phone is removed inside the refresh', async () => {
      const { one, held, ask, phoneId, stop } = await heldOwner();
      try {
        let release = (): void => undefined;
        held.gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        const inFlight = ask(`/v1/session?id=${SESSION.id}`);
        await vi.waitFor(() => expect(held.reached).toBe(1));
        await one.removePhone(phoneId);
        release();
        expect(await inFlight).toBe(404);
        expect(
          logged.some((l) => l.includes('refused a request on the tailnet door: unpaired'))
        ).toBe(true);
      } finally {
        await stop();
      }
    });
  });
});

describe('the fields the hash covers', () => {
  it('name the route table, so a fourth route would ask again', () => {
    expect(host().fields().routes).toEqual(POCKET_ROUTE_IDS);
  });

  it('are read fresh, so a keystore that cannot answer does not confirm', async () => {
    const one = await listeningHost();
    const offer = one.beginPairing(NO_KEY);
    const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
    one.pairing.present(present(secret, 'Greg iPhone'), '100.64.0.9');
    const view = one.pairing.view();
    one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' });
    keystore = false;
    expect(new PocketHost({ facts: FACTS, bindAddress: () => '100.64.0.1' })
      .status().confirmState).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// The registrar
// ---------------------------------------------------------------------------

describe('the registrar', () => {
  function registered(): Map<string, (event: unknown, ...args: unknown[]) => unknown> {
    const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
    const ipc = {
      handle: (channel: string, fn: (event: unknown, ...args: unknown[]) => unknown) => {
        handlers.set(channel, fn);
      }
    } as unknown as IpcMain;
    registerPocketIpc(ipc, host());
    return handlers;
  }

  it('serves exactly the ten pocket channels, setDoor and setPushAlerts among them', () => {
    expect([...registered().keys()].sort()).toEqual(
      [
        'pocket:allowPhone',
        'pocket:beginPairing',
        'pocket:cancelPairing',
        'pocket:confirmDoor',
        'pocket:forgetDoor',
        'pocket:pairingState',
        'pocket:removePhone',
        'pocket:setDoor',
        'pocket:setPushAlerts',
        'pocket:status'
      ].sort()
    );
  });

  it('refuses a push switch that is not a switch, and writes nothing', async () => {
    const setPush = registered().get('pocket:setPushAlerts');
    if (setPush === undefined) throw new Error('not registered');
    for (const bad of [null, {}, { on: 'true' }, true]) {
      await expect(Promise.resolve().then(() => setPush({}, bad))).rejects.toThrow(
        /could not read that switch/
      );
    }
    expect(readPocketStore().store).toBeNull();
  });

  it('hands the tailnet key through to the window, and a missing input refuses', async () => {
    const handlers = registered();
    const begin = handlers.get('pocket:beginPairing');
    if (begin === undefined) throw new Error('not registered');
    await expect(Promise.resolve().then(() => begin({}, undefined))).rejects.toThrow(
      /could not read that tailnet key/
    );
  });
});

// ---------------------------------------------------------------------------
// Phase 314: the switch, where a push may go, and the drop
// ---------------------------------------------------------------------------

const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
const tokenFor = (seed: string): string => sha(`p314-ipc-token-${seed}`);

/** Pair one phone through the shipping window, with a token or without. */
function pairPhone(
  one: InstanceType<typeof PocketHost>,
  label: string,
  push: Record<string, unknown> = {}
): string {
  if (!door.listening) door.listening = true;
  const offer = one.beginPairing(NO_KEY);
  const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
  one.pairing.present(present(secret, label, push), '100.64.0.9');
  const view = one.pairing.view();
  one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' });
  one.pairing.cancel();
  return one.status().phones.find((p) => p.label === label)?.id ?? '';
}

/** Confirm the door's current fields, as a person pressing the button does. */
async function confirmNow(one: InstanceType<typeof PocketHost>): Promise<void> {
  const now = pocketConfirmStatus(one.fields());
  await one.confirmDoor({ linesRead: now.lines, hashRead: now.hash });
}

describe('the push switch', () => {
  it('is off until a person turns it on, and turning it on asks again', async () => {
    const one = host();
    pairPhone(one, 'Greg iPhone', { apt: tokenFor('a'), ape: 'development' });
    expect(one.status().pushAlerts).toBe(false);
    expect(one.status().confirmState).toBe('confirmed');
    const after = await one.setPushAlerts(true);
    expect(after.pushAlerts).toBe(true);
    // A HASHED field: the door is no longer the one he confirmed.
    expect(after.confirmState).toBe('changed');
    await confirmNow(one);
    expect(one.status().confirmState).toBe('confirmed');
  });

  it('survives a fresh host, because it is in the sealed store', async () => {
    const one = host();
    await one.setPushAlerts(true);
    expect(host().status().pushAlerts).toBe(true);
    expect(readPocketStore().store?.pushAlerts).toBe(true);
  });

  it('closes a listening door until the person confirms the change (Phase 316)', async () => {
    const one = await listeningHost();
    const stops = door.stops;
    const after = await one.setPushAlerts(true);
    expect(door.stops).toBe(stops + 1);
    expect(after.state).toBe('refused');
    await confirmNow(one);
    expect(one.status().state).toBe('listening');
  });
});

describe('where a push may go', () => {
  it('is nowhere while the switch is off, even with a live token confirmed', () => {
    const one = host();
    pairPhone(one, 'Greg iPhone', { apt: tokenFor('a'), ape: 'development' });
    expect(one.status().confirmState).toBe('confirmed');
    expect(one.pushDestinations()).toEqual([]);
  });

  it('is nowhere while the door’s current fields are not the confirmed ones', async () => {
    const one = host();
    pairPhone(one, 'Greg iPhone', { apt: tokenFor('a'), ape: 'development' });
    await one.setPushAlerts(true);
    expect(one.status().confirmState).toBe('changed');
    expect(one.pushDestinations()).toEqual([]);
  });

  it('is every phone with a live token once the switch is on and confirmed', async () => {
    const one = host();
    const t = tokenFor('a');
    const id = pairPhone(one, 'Greg iPhone', { apt: t.toUpperCase(), ape: 'production' });
    pairPhone(one, 'No alerts');
    await one.setPushAlerts(true);
    await confirmNow(one);
    expect(one.pushDestinations()).toEqual([
      { phoneId: id, token: t, environment: 'production', tokenDigest: sha(t) }
    ]);
    // The phone with no token is paired and is told nothing.
    const views = Object.fromEntries(one.status().phones.map((p) => [p.label, p.alerts]));
    expect(views).toEqual({ 'Greg iPhone': 'on', 'No alerts': 'none' });
  });

  it('stops at once when the switch goes off, before any confirm', async () => {
    const one = host();
    pairPhone(one, 'Greg iPhone', { apt: tokenFor('a'), ape: 'development' });
    await one.setPushAlerts(true);
    await confirmNow(one);
    expect(one.pushDestinations()).toHaveLength(1);
    await one.setPushAlerts(false);
    expect(one.pushDestinations()).toEqual([]);
  });

  it('is nowhere after a phone is removed, until the door is confirmed again', async () => {
    const one = host();
    pairPhone(one, 'A', { apt: tokenFor('a'), ape: 'development' });
    const b = pairPhone(one, 'B', { apt: tokenFor('b'), ape: 'development' });
    await one.setPushAlerts(true);
    await confirmNow(one);
    expect(one.pushDestinations()).toHaveLength(2);
    await one.removePhone(b);
    expect(one.pushDestinations()).toEqual([]);
    await confirmNow(one);
    expect(one.pushDestinations().map((d) => d.tokenDigest)).toEqual([sha(tokenFor('a'))]);
  });

  it('never reaches the renderer: no status or view carries a token', async () => {
    const one = host();
    const t = tokenFor('a');
    pairPhone(one, 'Greg iPhone', { apt: t, ape: 'development' });
    await one.setPushAlerts(true);
    await confirmNow(one);
    expect(JSON.stringify(one.status()).includes(t)).toBe(false);
    expect(JSON.stringify(one.pairing.view()).includes(t)).toBe(false);
  });
});

describe('a token Apple refused is dropped for good', () => {
  it('leaves the destinations, says stopped, and does NOT move the hash', async () => {
    const one = host();
    const ta = tokenFor('a');
    const tb = tokenFor('b');
    pairPhone(one, 'A', { apt: ta, ape: 'development' });
    pairPhone(one, 'B', { apt: tb, ape: 'development' });
    await one.setPushAlerts(true);
    await confirmNow(one);
    const hashBefore = pocketConfirmStatus(one.fields()).hash;
    one.dropPushToken(sha(tb));
    expect(one.pushDestinations().map((d) => d.token)).toEqual([ta]);
    expect(pocketConfirmStatus(one.fields()).hash).toBe(hashBefore);
    expect(one.status().confirmState).toBe('confirmed');
    const views = Object.fromEntries(one.status().phones.map((p) => [p.label, p.alerts]));
    expect(views).toEqual({ A: 'on', B: 'stopped' });
  });

  it('stays dropped across a restart, and a second drop is not a second row', async () => {
    const one = host();
    const tb = tokenFor('b');
    pairPhone(one, 'B', { apt: tb, ape: 'development' });
    await one.setPushAlerts(true);
    await confirmNow(one);
    one.dropPushToken(sha(tb));
    one.dropPushToken(sha(tb));
    expect(readPocketStore().store?.deadPushTokens).toEqual([sha(tb)]);
    expect(host().pushDestinations()).toEqual([]);
  });

  it('is dropped for this run even when the sealed write fails (the fix round)', async () => {
    const one = host();
    const ta = tokenFor('a');
    const tb = tokenFor('b');
    pairPhone(one, 'A', { apt: ta, ape: 'development' });
    pairPhone(one, 'B', { apt: tb, ape: 'development' });
    await one.setPushAlerts(true);
    await confirmNow(one);
    const hashBefore = pocketConfirmStatus(one.fields()).hash;
    // The keystore goes away, so the drop cannot be sealed to disk.
    keystore = false;
    one.dropPushToken(sha(tb));
    keystore = true;
    expect(one.pushDestinations().map((d) => d.token)).toEqual([ta]);
    expect(pocketConfirmStatus(one.fields()).hash).toBe(hashBefore);
    const views = Object.fromEntries(one.status().phones.map((p) => [p.label, p.alerts]));
    expect(views).toEqual({ A: 'on', B: 'stopped' });
    // Named limit: the disk never heard of it, so a restart before the next
    // successful write forgets it.
    expect(readPocketStore().store?.deadPushTokens).toEqual([]);
  });

  it('stays dropped when the phone pairs again with the SAME token, and is live with a new one', async () => {
    const one = host();
    const old = tokenFor('old');
    pairPhone(one, 'Greg iPhone', { apt: old, ape: 'development' });
    await one.setPushAlerts(true);
    await confirmNow(one);
    one.dropPushToken(sha(old));
    pairPhone(one, 'Greg iPhone', { apt: old, ape: 'development' });
    expect(one.pushDestinations().some((d) => d.token === old)).toBe(false);
    const fresh = tokenFor('fresh');
    pairPhone(one, 'Greg iPhone', { apt: fresh, ape: 'development' });
    expect(one.pushDestinations().map((d) => d.token)).toContain(fresh);
  });

  it('ignores anything that is not a sha256 digest', () => {
    const one = host();
    pairPhone(one, 'B', { apt: tokenFor('b'), ape: 'development' });
    one.dropPushToken(tokenFor('b').toUpperCase());
    one.dropPushToken('');
    expect(readPocketStore().store?.deadPushTokens).toEqual([]);
  });
});
