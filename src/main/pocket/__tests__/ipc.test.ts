/**
 * The owner behind Settings then Phone (Phase 313).
 *
 * The one thing worth proving here that neither `./pairing.test.ts` nor
 * `./server.test.ts` can: THE ACKNOWLEDGEMENT IS SUPPLIED IN MAIN. The renderer
 * hands over two things, the lines it drew and the hash it drew them from, and
 * nothing else — there is no field on `PocketAllowInput` that could carry the
 * sentence, so a renderer cannot compose it, a file cannot hold it and a
 * convenience path cannot pass it through.
 *
 * Nothing here binds a socket. `PocketHost.start()` is not called: the door's
 * own listener has its own tests in `./bind.test.ts`, and everything below is
 * about the record, the store and the presses.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createCipheriv,
  generateKeyPairSync,
  hkdfSync,
  randomBytes
} from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Project, Session } from '@shared/types';
import type { PocketFacts } from '../routes';

let userData = '';
let keystore = true;

const MARKER = '--tortie-pocket-ipc-test--';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: () => undefined },
  safeStorage: {
    isEncryptionAvailable: () => keystore,
    encryptString: (text: string) => Buffer.from(`${MARKER}${text}`, 'utf8'),
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

const { PocketHost, POCKET_DEFAULT_PORT } = await import('../ipc');
const { POCKET_CONFIRM_ACKNOWLEDGEMENT, pocketConfirmStatus } = await import(
  '../pairing'
);
const { POCKET_ROUTE_IDS, POCKET_CONFIRM_WARNING } = await import(
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
  catchUp: async () => null,
  lastTurn: async () => ({ answerText: null, turnCount: 0 }),
  turns: async () => ({ turns: [], more: false }),
  handoff: () => null
};

function host(): InstanceType<typeof PocketHost> {
  return new PocketHost({ facts: FACTS, bindAddress: () => '100.64.0.1' });
}

function b64u(buf: Buffer): string {
  return buf.toString('base64url');
}

/** A phone's sealed presentation, spelled here from the wire format. */
function present(secretB64u: string, label: string): Buffer {
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
    xk: b64u(x.publicKey.export({ format: 'der', type: 'spki' }))
  });
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.from(
    JSON.stringify({ iv: b64u(iv), ct: b64u(ct), tag: b64u(cipher.getAuthTag()) }),
    'utf8'
  );
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p313-ipc-'));
  keystore = true;
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

  it('says there is no address when this Mac has none', () => {
    const status = new PocketHost({
      facts: FACTS,
      bindAddress: () => ''
    }).status();
    expect(status.address).toBeNull();
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
});

describe('the person is asked last, and main supplies the sentence', () => {
  it('has no field a renderer could put the acknowledgement in', () => {
    const one = host();
    const offer = one.beginPairing();
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
    // And the sentence main supplies is the module's own literal.
    expect(POCKET_CONFIRM_ACKNOWLEDGEMENT).toBe(
      'a person read what this door will answer and allowed it'
    );
  });

  it('refuses an allow whose hash is not the one the sheet drew', () => {
    const one = host();
    const offer = one.beginPairing();
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

  it('carries the fingerprint the person matches on both screens', () => {
    const one = host();
    const offer = one.beginPairing();
    const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
    one.pairing.present(present(secret, 'Greg iPhone'), '100.64.0.9');
    const view = one.pairing.view();
    one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' });
    expect(one.status().phones[0]?.fingerprint).toBe(view.fingerprint);
  });
});

describe('removing a phone', () => {
  function withOnePhone(): {
    one: InstanceType<typeof PocketHost>;
    phoneId: string;
  } {
    const one = host();
    const offer = one.beginPairing();
    const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
    one.pairing.present(present(secret, 'Greg iPhone'), '100.64.0.9');
    const view = one.pairing.view();
    one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' });
    const phoneId = one.status().phones[0]?.id ?? '';
    return { one, phoneId };
  }

  it('drops it and withdraws the agreement with it', () => {
    const { one, phoneId } = withOnePhone();
    expect(one.status().confirmState).toBe('confirmed');
    const after = one.removePhone(phoneId);
    expect(after.phones).toEqual([]);
    // A removed phone is not a phone whose approval is still on record.
    expect(after.confirmState).toBe('never');
    expect(pocketConfirmStatus(one.fields()).state).toBe('never');
  });

  it('changes nothing for an id nobody has', () => {
    const { one } = withOnePhone();
    const before = one.status();
    const after = one.removePhone('not-a-phone');
    expect(after.phones).toEqual(before.phones);
    expect(after.confirmState).toBe('confirmed');
  });
});

describe('the fields the hash covers', () => {
  it('name the route table, so a fourth route would ask again', () => {
    expect(host().fields().routes).toEqual(POCKET_ROUTE_IDS);
  });

  it('are read fresh, so a keystore that cannot answer does not confirm', () => {
    const one = host();
    const offer = one.beginPairing();
    const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
    one.pairing.present(present(secret, 'Greg iPhone'), '100.64.0.9');
    const view = one.pairing.view();
    one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' });
    keystore = false;
    expect(new PocketHost({ facts: FACTS, bindAddress: () => '100.64.0.1' })
      .status().confirmState).toBe('unknown');
  });
});
