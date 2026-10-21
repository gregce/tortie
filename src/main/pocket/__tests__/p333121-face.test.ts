/**
 * The confirm block's face (Phase 333.12.1, build/p333121/SPEC.md §9.2 rows
 * F1 to F5), driven through the SHIPPING composer `pocketConfirmFace` and, for
 * the lines and the hash, the SHIPPING `describePocketDoor` and
 * `pocketExecutionHash` (`electron` is mocked as `./pairing.test.ts` mocks it,
 * with a scratch userData; nothing here touches the keychain or a disk path).
 *
 * WHY THIS FILE EXISTS. His ruling of 2026-10-15 moved every hashed line
 * behind Details and put a face of a few labelled lines above Allow. Refusal 8
 * rests on a person being able to read everything that decides what runs
 * before it answers the internet, so the face must never claim a fact the
 * lines do not hold, and every hashed fact must still move the lines. Each row
 * is red if its clause is taken out of the shipping code:
 *
 *   F1  the four rows over the eleven, for `never`, `changed` and `unknown`,
 *       alerts on and off, zero, one and two phones (in id order whatever order
 *       they are handed in), and the program as the app's name, the whole path
 *       or nothing (D3, D4, D5).
 *   F2  `confirmed`: no rows, and the waiting routes in their order, `New:
 *       <id>` and no sentence with no row in the table, `New: <title>` and its
 *       sentence with one, and a waiting route left out of `Your phone can`
 *       (D6, D7, D8).
 *   F3  EVERY HASHED FACT MOVES DETAILS: the fifteen moves of §2.3, each alone
 *       on a `changed` composition built as main builds it, move the hash and
 *       the lines; the face moves for exactly the eight §2.3 names.
 *   F4  the face says nothing private: no tailnet, fingerprint, device digest,
 *       key or token in any face value.
 *   F5  the face's clause table is keyed by every route and no other, and the
 *       waiting routes' table is empty and frozen.
 *
 * `ablation:p313`'s `face` check runs this file (AF2a to AF2d, AF4a, AF4b).
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';

import type { PocketConfirmFace, PocketNewRouteTable, PocketRouteId, PocketStatus } from '@shared/ipc/pocket';
import type { PocketExecutionFields, PocketPhoneFields } from '../pairing';

const userData = mkdtempSync(join(tmpdir(), 'p333121-face-'));

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: () => {
      throw new Error('p333121: no seal is ever written by this file');
    },
    decryptString: () => {
      throw new Error('p333121: no seal is ever read by this file');
    }
  }
}));

const { describePocketDoor, pairFingerprint, phoneIdOf, pocketExecutionHash, pushTokenDigest } = await import('../pairing');
const { proposedRoutes, servedRoutesOf, waitingRoutesOf } = await import('../allowed-routes');
const {
  LEGACY_ALLOWED_ROUTES,
  POCKET_FACE_ALERTS,
  POCKET_FACE_ALERTS_OFF,
  POCKET_FACE_ALERTS_ON,
  POCKET_FACE_CAN,
  POCKET_FACE_CAN_NOTHING,
  POCKET_FACE_CLAUSES,
  POCKET_FACE_NEW,
  POCKET_FACE_NO_PHONE,
  POCKET_FACE_PHONES,
  POCKET_FACE_REACH,
  POCKET_NEW_ROUTE_WORDS,
  POCKET_ROUTE_IDS,
  pocketConfirmFace,
  pocketFaceProgram
} = await import('@shared/ipc/pocket');
type ConfirmState = PocketStatus['confirmState'];

afterAll(() => {
  rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const APP = '/Applications/Tailscale.app/Contents/MacOS/Tailscale';
const BREW = '/opt/homebrew/bin/tailscale';
const LOCAL = '/usr/local/bin/tailscale';
const NAME = 'mac.tail0000.ts.net';
const TAILNET = 'example.github';
/** The app run's own plant (build/p33312/plant.mjs): no build has it, so it is cast. */
const PROBE = 'probe' as PocketRouteId;
/** Every clause over the eleven, in the table's key order, as his approved drawing says it. */
const CAN_ELEVEN = 'see your sessions, type into them, answer questions, send a message, end a session';
/** Every clause over the twelve a 0.112.0 Mac had (Phase 346 added Start's, last: build/p346/SPEC.md D3). */
const CAN_TWELVE = `${CAN_ELEVEN}, start sessions`;
/** Phase 348 (build/p348/SPEC.md D32): this build's fourteen, Remove's and paste's clauses after Start's. */
const CAN_FOURTEEN = `${CAN_TWELVE}, remove ended sessions, paste into a session`;

/** A phone as main stores one: its id derived from its signing key, as `phoneIdOf` derives it. */
function phoneOf(seed: string, label: string, alerts = true): PocketPhoneFields {
  const signingKey = `sign-${seed}-${'s'.repeat(40)}`;
  return {
    id: phoneIdOf(signingKey),
    label,
    signingKey,
    exchangeKey: `exch-${seed}-${'x'.repeat(40)}`,
    clientKey: `client-${seed}-${'c'.repeat(40)}`,
    pushToken: alerts ? pushTokenOf(seed) : '',
    pushEnvironment: alerts ? 'production' : ''
  };
}

/** An Apple device token, 64 lowercase hex, derived from a seed. */
function pushTokenOf(seed: string): string {
  return pushTokenDigest(`p333121-token-${seed}`);
}

/** A door's fields: the eleven allowed, one phone with an alert address, alerts on. */
function fieldsOf(over: Partial<PocketExecutionFields> = {}): PocketExecutionFields {
  return {
    funnelProgram: LOCAL,
    tailnet: TAILNET,
    publicName: NAME,
    publicPort: 8443,
    bindAtLaunch: true,
    routes: [...LEGACY_ALLOWED_ROUTES],
    phones: [phoneOf('a', 'Greg’s iPhone')],
    pushAlerts: true,
    ...over
  };
}

interface Drawn {
  readonly hash: string;
  readonly lines: readonly string[];
  readonly face: PocketConfirmFace;
}

/**
 * The block as main draws it, re-built here the way `status()` builds it: the
 * allowed set is `fields.routes`, the proposal is the allowed set with the
 * build's routes added while a record exists, and the face is composed from
 * that one proposal and the two lists the answer carries.
 */
function drawn(fields: PocketExecutionFields, state: ConfirmState, build: readonly PocketRouteId[] = POCKET_ROUTE_IDS): Drawn {
  const proposal: PocketExecutionFields = { ...fields, routes: proposedRoutes(fields.routes, build, state !== 'never') };
  const offered = servedRoutesOf(proposal.routes, build);
  const waiting = waitingRoutesOf(fields.routes, build, state === 'confirmed' || state === 'changed');
  const summary = describePocketDoor(proposal);
  expect(summary.hash).toBe(pocketExecutionHash(proposal));
  return { hash: summary.hash, lines: summary.lines, face: pocketConfirmFace(proposal, offered, waiting, state) };
}

/** A row's value by its key, or undefined. */
const value = (face: PocketConfirmFace, key: string): string | undefined => face.rows.find((r) => r.key === key)?.value;

// ---------------------------------------------------------------------------
// F1: the four rows
// ---------------------------------------------------------------------------

describe('F1: the four rows over the eleven, labelled once, in order', () => {
  for (const state of ['never', 'changed', 'unknown'] as const) {
    it(`draws Reachable at, Your phone can, Phones and Alerts for ${state}`, () => {
      const face = pocketConfirmFace(fieldsOf({ funnelProgram: APP }), POCKET_ROUTE_IDS, [], state);
      expect(face.rows.map((r) => [r.key, r.label])).toEqual([
        ['reach', POCKET_FACE_REACH],
        ['can', POCKET_FACE_CAN],
        ['phones', POCKET_FACE_PHONES],
        ['alerts', POCKET_FACE_ALERTS]
      ]);
      expect([POCKET_FACE_REACH, POCKET_FACE_CAN, POCKET_FACE_PHONES, POCKET_FACE_ALERTS]).toEqual([
        'Reachable at',
        'Your phone can',
        'Phones',
        'Alerts'
      ]);
      expect(value(face, 'reach')).toBe(`${NAME}:8443, by Tailscale`);
      // Over this build's table (Phase 346: twelve; Phase 348: fourteen), over
      // the twelve a 0.112.0 store allowed, and over the eleven a store that
      // never allowed Start reads as, byte for byte the parent's.
      expect(value(face, 'can')).toBe(CAN_FOURTEEN);
      expect(value(pocketConfirmFace(fieldsOf({ funnelProgram: APP }), [...LEGACY_ALLOWED_ROUTES, 'start'], [], state), 'can')).toBe(CAN_TWELVE);
      expect(value(pocketConfirmFace(fieldsOf({ funnelProgram: APP }), LEGACY_ALLOWED_ROUTES, [], state), 'can')).toBe(CAN_ELEVEN);
      expect(value(face, 'phones')).toBe('Greg’s iPhone');
      expect(value(face, 'alerts')).toBe('through Apple, never what an agent asks');
      expect(face.added).toEqual([]);
    });
  }

  it('says the clauses in the table’s order whatever order the routes are offered in', () => {
    const reversed = [...POCKET_ROUTE_IDS].reverse();
    expect(value(pocketConfirmFace(fieldsOf(), reversed, [], 'never'), 'can')).toBe(CAN_FOURTEEN);
    // `pair` alone says nothing a phone can do; no clause at all says so.
    expect(value(pocketConfirmFace(fieldsOf(), ['pair'], [], 'never'), 'can')).toBe(POCKET_FACE_CAN_NOTHING);
    expect(POCKET_FACE_CAN_NOTHING).toBe('do nothing');
    // The six reads say one clause, once.
    const reads: PocketRouteId[] = ['blocked', 'session', 'turns', 'sessions', 'screen', 'scrollback'];
    expect(value(pocketConfirmFace(fieldsOf(), reads, [], 'never'), 'can')).toBe('see your sessions');
    expect(value(pocketConfirmFace(fieldsOf(), ['end', 'turns'], [], 'never'), 'can')).toBe('see your sessions, end a session');
  });

  it('says alerts off, and none yet with no phone', () => {
    const face = pocketConfirmFace(fieldsOf({ phones: [], pushAlerts: false }), POCKET_ROUTE_IDS, [], 'never');
    expect(value(face, 'phones')).toBe(POCKET_FACE_NO_PHONE);
    expect(POCKET_FACE_NO_PHONE).toBe('none yet');
    expect(value(face, 'alerts')).toBe(POCKET_FACE_ALERTS_OFF);
    expect(POCKET_FACE_ALERTS_OFF).toBe('off');
    expect(POCKET_FACE_ALERTS_ON).toBe('through Apple, never what an agent asks');
  });

  it('names two phones in id order, whatever order they are handed in', () => {
    const one = phoneOf('a', 'Alpha');
    const two = phoneOf('b', 'Bravo');
    const [first, second] = [one, two].sort((a, b) => (a.id < b.id ? -1 : 1));
    if (first === undefined || second === undefined) throw new Error('two phones');
    const want = `${first.label}, ${second.label}`;
    // The order the ids sort in, so a composer that keeps the order handed in reads the other one.
    const forward = pocketConfirmFace(fieldsOf({ phones: [first, second] }), POCKET_ROUTE_IDS, [], 'changed');
    const backward = pocketConfirmFace(fieldsOf({ phones: [second, first] }), POCKET_ROUTE_IDS, [], 'changed');
    expect(value(forward, 'phones')).toBe(want);
    expect(value(backward, 'phones')).toBe(want);
    // The lines name them in the same order (pairing.ts sorts by id too).
    const lines = describePocketDoor(fieldsOf({ phones: [second, first] })).lines.filter((l) => l.startsWith('Allows the phone'));
    expect(lines.map((l) => /"([^"]*)"/.exec(l)?.[1])).toEqual([first.label, second.label]);
  });

  it('names the program by its app under /Applications, by its whole path otherwise, and leaves `, by` off with none', () => {
    expect(pocketFaceProgram(APP)).toBe('Tailscale');
    expect(pocketFaceProgram('/Applications/Tailscale Beta.app/Contents/MacOS/Tailscale')).toBe('Tailscale Beta');
    expect(pocketFaceProgram(BREW)).toBe(BREW);
    expect(pocketFaceProgram(LOCAL)).toBe(LOCAL);
    // Not the app's own program folder: the whole path, so a move there shows.
    expect(pocketFaceProgram('/Applications/Tailscale.app/Contents/Resources/tailscale')).toBe(
      '/Applications/Tailscale.app/Contents/Resources/tailscale'
    );
    expect(pocketFaceProgram('/Users/x/Applications/Tailscale.app/Contents/MacOS/Tailscale')).toBe(
      '/Users/x/Applications/Tailscale.app/Contents/MacOS/Tailscale'
    );
    expect(pocketFaceProgram('')).toBe('');
    const at = (program: string): string | undefined =>
      value(pocketConfirmFace(fieldsOf({ funnelProgram: program }), POCKET_ROUTE_IDS, [], 'never'), 'reach');
    expect(at(APP)).toBe(`${NAME}:8443, by Tailscale`);
    expect(at(BREW)).toBe(`${NAME}:8443, by ${BREW}`);
    expect(at('')).toBe(`${NAME}:8443`);
    expect(value(pocketConfirmFace(fieldsOf({ publicPort: 10000 }), POCKET_ROUTE_IDS, [], 'never'), 'reach')).toBe(
      `${NAME}:10000, by ${LOCAL}`
    );
  });
});

// ---------------------------------------------------------------------------
// F2: the waiting routes
// ---------------------------------------------------------------------------

describe('F2: confirmed draws only the waiting routes, by their words or their id', () => {
  it('draws no rows while the agreement on record holds, and every waiting route in the order handed in', () => {
    const none = pocketConfirmFace(fieldsOf(), POCKET_ROUTE_IDS, [], 'confirmed');
    expect(none).toEqual({ rows: [], added: [] });
    const other = 'other' as PocketRouteId;
    const face = pocketConfirmFace(fieldsOf(), [...POCKET_ROUTE_IDS, PROBE, other], [other, PROBE], 'confirmed');
    expect(face.rows).toEqual([]);
    expect(face.added).toEqual([
      { id: other, title: 'New: other', sentence: null },
      { id: PROBE, title: 'New: probe', sentence: null }
    ]);
    expect(POCKET_FACE_NEW).toBe('New');
  });

  it('draws a route with a row as its title and sentence, and one with none by its id, never nothing', () => {
    const words = {
      probe: { title: 'read a probe from your phone', sentence: 'Your phone could read a probe here.' }
    } as unknown as PocketNewRouteTable;
    const face = pocketConfirmFace(fieldsOf(), [...POCKET_ROUTE_IDS, PROBE], [PROBE], 'confirmed', words);
    expect(face.added).toEqual([{ id: PROBE, title: 'New: read a probe from your phone', sentence: 'Your phone could read a probe here.' }]);
    // The shipping table, which has no row for it (Phase 346's only row is Start's): the id, and no sentence.
    expect(pocketConfirmFace(fieldsOf(), [...POCKET_ROUTE_IDS, PROBE], [PROBE], 'confirmed').added).toEqual([
      { id: PROBE, title: 'New: probe', sentence: null }
    ]);
  });

  it('draws the four rows and the New lines together on a moved field (D8), and leaves a waiting route out of what the phone can do', () => {
    // A table cast over `keys`, so a waiting route WITH a face clause can be made.
    const words = { keys: { title: 'type from your phone', sentence: 'Your phone could type into a session.' } } as unknown as PocketNewRouteTable;
    const face = pocketConfirmFace(fieldsOf(), POCKET_ROUTE_IDS, ['keys'], 'changed', words);
    expect(face.rows).toHaveLength(4);
    expect(value(face, 'can')).toBe(
      'see your sessions, answer questions, send a message, end a session, start sessions, remove ended sessions, paste into a session'
    );
    expect(value(face, 'can')).not.toContain('type into them');
    expect(face.added).toEqual([{ id: 'keys', title: 'New: type from your phone', sentence: 'Your phone could type into a session.' }]);
    // Never on the face twice: what a phone can do with the route in it is said only once it is allowed.
    expect(value(pocketConfirmFace(fieldsOf(), POCKET_ROUTE_IDS, [], 'changed', words), 'can')).toBe(CAN_FOURTEEN);
  });
});

// ---------------------------------------------------------------------------
// F3: every hashed fact moves Details, and the face exactly where §2.3 says
// ---------------------------------------------------------------------------

describe('F3: every hashed fact moves the hash and the lines, and the face for exactly eight of them', () => {
  const base = fieldsOf();
  const [phone] = base.phones;
  if (phone === undefined) throw new Error('one phone');
  const withPhone = (over: Partial<PocketPhoneFields>): PocketExecutionFields => ({ ...base, phones: [{ ...phone, ...over }] });
  const newSigning = `${phone.signingKey}-moved`;

  /** The fifteen moves of build/p333121/SPEC.md §2.3, and whether each moves the face. */
  const MOVES: readonly { readonly name: string; readonly face: boolean; readonly moved: () => Drawn }[] = [
    { name: 'the program at another path of the same name', face: true, moved: () => drawn({ ...base, funnelProgram: BREW }, 'changed') },
    { name: 'the program at the app', face: true, moved: () => drawn({ ...base, funnelProgram: APP }, 'changed') },
    { name: 'the tailnet', face: false, moved: () => drawn({ ...base, tailnet: 'elsewhere.github' }, 'changed') },
    { name: 'the public name', face: true, moved: () => drawn({ ...base, publicName: 'moved.tail0000.ts.net' }, 'changed') },
    { name: 'the public port', face: true, moved: () => drawn({ ...base, publicPort: 10000 }, 'changed') },
    { name: 'start with Tortie', face: false, moved: () => drawn({ ...base, bindAtLaunch: false }, 'changed') },
    {
      name: 'a waiting route',
      face: true,
      moved: () => drawn(base, 'changed', [...POCKET_ROUTE_IDS, PROBE])
    },
    { name: 'alerts', face: true, moved: () => drawn({ ...base, pushAlerts: false }, 'changed') },
    { name: 'a phone’s label', face: true, moved: () => drawn(withPhone({ label: 'Another iPhone' }), 'changed') },
    {
      name: 'a phone’s signing key',
      face: false,
      moved: () => drawn(withPhone({ signingKey: newSigning, id: phoneIdOf(newSigning) }), 'changed')
    },
    { name: 'a phone’s exchange key', face: false, moved: () => drawn(withPhone({ exchangeKey: `${phone.exchangeKey}-moved` }), 'changed') },
    { name: 'a phone’s client key', face: false, moved: () => drawn(withPhone({ clientKey: `${phone.clientKey}-moved` }), 'changed') },
    { name: 'a phone’s alert address', face: false, moved: () => drawn(withPhone({ pushToken: pushTokenOf('moved') }), 'changed') },
    { name: 'a phone’s environment', face: false, moved: () => drawn(withPhone({ pushEnvironment: 'development' }), 'changed') },
    {
      name: 'a second phone of the same label',
      face: true,
      moved: () => drawn({ ...base, phones: [phone, { ...phoneOf('z', phone.label) }] }, 'changed')
    }
  ];

  it('holds exactly fifteen moves, eight of them on the face (§2.3)', () => {
    expect(MOVES).toHaveLength(15);
    expect(MOVES.filter((m) => m.face).map((m) => m.name)).toEqual([
      'the program at another path of the same name',
      'the program at the app',
      'the public name',
      'the public port',
      'a waiting route',
      'alerts',
      'a phone’s label',
      'a second phone of the same label'
    ]);
  });

  const before = drawn(base, 'changed');
  for (const move of MOVES) {
    it(`${move.name}: moves the hash and the lines, and ${move.face ? 'moves' : 'leaves'} the face`, () => {
      const after = move.moved();
      expect(after.hash, move.name).not.toBe(before.hash);
      expect(after.lines, move.name).not.toEqual(before.lines);
      // Details is the lines byte for byte, so a moved line is a moved Details.
      expect(JSON.stringify(after.face) !== JSON.stringify(before.face), move.name).toBe(move.face);
    });
  }

  it('reads the same with no move, so every difference above is the move’s', () => {
    const again = drawn(fieldsOf(), 'changed');
    expect(again.hash).toBe(before.hash);
    expect(again.lines).toEqual(before.lines);
    expect(again.face).toEqual(before.face);
  });

  it('names the waiting route on the face as New and in the lines’ route line', () => {
    const after = drawn(base, 'changed', [...POCKET_ROUTE_IDS, PROBE]);
    // Phase 346: `base` allows the eleven, so this build's Start waits beside
    // the plant, by its own words, in the table's order; Phase 348's Remove
    // and paste wait after it, each by its own words (build/p348/SPEC.md D32).
    expect(after.face.added).toEqual([
      { id: 'start', title: 'New: start sessions from your phone', sentence: 'An agent installed where the project is, with your launch defaults.' },
      { id: 'remove', title: 'New: remove sessions from your phone', sentence: 'An ended session moves to Past Sessions on this Mac, where you can restore it.' },
      { id: 'paste', title: 'New: paste into sessions from your phone', sentence: 'It lands as a paste at this Mac does, with no Return added.' },
      { id: PROBE, title: 'New: probe', sentence: null }
    ]);
    expect(after.face.rows).toHaveLength(4);
    expect(after.lines.find((l) => l.startsWith('Answers these and nothing else:'))).toContain('probe');
  });
});

// ---------------------------------------------------------------------------
// F4: nothing private on the face
// ---------------------------------------------------------------------------

describe('F4: the face says nothing private', () => {
  it('holds no tailnet, fingerprint, device digest, key or token in any value', () => {
    const phones = [phoneOf('a', 'Greg’s iPhone'), phoneOf('b', 'Work iPhone')];
    for (const state of ['never', 'changed', 'unknown', 'confirmed'] as const) {
      const face = drawn(fieldsOf({ funnelProgram: APP, phones }), state, [...POCKET_ROUTE_IDS, PROBE]).face;
      const said = [...face.rows.flatMap((r) => [r.label, r.value]), ...face.added.flatMap((a) => [a.title, a.sentence ?? ''])].join('\n');
      expect(said, state).not.toContain(TAILNET);
      for (const p of phones) {
        for (const secret of [
          p.signingKey,
          p.exchangeKey,
          p.clientKey,
          p.pushToken,
          p.id,
          pairFingerprint(p.signingKey, p.exchangeKey, p.clientKey),
          pushTokenDigest(p.pushToken).slice(0, 8),
          p.pushEnvironment
        ]) {
          expect(said.includes(secret), `${state}: ${secret.slice(0, 12)}`).toBe(false);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// F5: the two tables
// ---------------------------------------------------------------------------

describe('F5: the face’s tables', () => {
  it('keys the clause table by every route and no other', () => {
    expect(Object.keys(POCKET_FACE_CLAUSES).sort()).toEqual([...POCKET_ROUTE_IDS].sort());
    expect(Object.keys(POCKET_FACE_CLAUSES)).toEqual([
      'blocked',
      'session',
      'turns',
      'sessions',
      'screen',
      'scrollback',
      'keys',
      'choose',
      'say',
      'end',
      'pair',
      'start',
      'remove',
      'paste'
    ]);
    expect(POCKET_FACE_CLAUSES.pair).toBeNull();
    // Phase 346 (build/p346/SPEC.md D3).
    expect(POCKET_FACE_CLAUSES.start).toBe('start sessions');
    // Phase 348 (build/p348/SPEC.md D32).
    expect(POCKET_FACE_CLAUSES.remove).toBe('remove ended sessions');
    expect(POCKET_FACE_CLAUSES.paste).toBe('paste into a session');
    expect(Object.isFrozen(POCKET_FACE_CLAUSES)).toBe(true);
  });

  // PHASE 346 (build/p346/SPEC.md D3) added the first row, Start's, in his
  // answers' words rather than 333.12.1 D7's draft; PHASE 348 (build/p348/SPEC.md
  // D32) Remove's and paste's, after it.
  it('holds exactly Start’s, Remove’s and paste’s rows in the waiting routes’ table, frozen', () => {
    expect(Object.keys(POCKET_NEW_ROUTE_WORDS)).toEqual(['start', 'remove', 'paste']);
    expect(POCKET_NEW_ROUTE_WORDS.start).toEqual({
      title: 'start sessions from your phone',
      sentence: 'An agent installed where the project is, with your launch defaults.'
    });
    expect(POCKET_NEW_ROUTE_WORDS.remove).toEqual({
      title: 'remove sessions from your phone',
      sentence: 'An ended session moves to Past Sessions on this Mac, where you can restore it.'
    });
    expect(POCKET_NEW_ROUTE_WORDS.paste).toEqual({
      title: 'paste into sessions from your phone',
      sentence: 'It lands as a paste at this Mac does, with no Return added.'
    });
    expect(Object.isFrozen(POCKET_NEW_ROUTE_WORDS)).toBe(true);
  });
});
