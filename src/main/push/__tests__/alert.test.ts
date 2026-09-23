/**
 * The alert's bytes (Phase 314, SPEC §2.1 to §2.5).
 *
 * THE EXPECTED BYTES ARE WRITTEN OUT BY HAND in this file, as strings, from
 * SPEC §2.3, and never produced by calling the composer a second time. A
 * composer that changed its key order, dropped the sound, added a key, or put
 * a machine into the body when there is none, fails a byte comparison here.
 *
 * THE CEILING IS PROVED MAXIMAL, not just under the cap: for every clipped
 * payload the test rebuilds the next longer candidate itself and requires it to
 * exceed 4096 bytes, so a clip that cut too much passes nothing.
 *
 * Nothing here opens a socket, reads a file, or touches Electron.
 */

import { describe, expect, it } from 'vitest';
import type { PocketBlockedRow } from '@shared/ipc/pocket';
import { PUSH_WAKE_SEEN } from '@shared/push-copy';
import { NEEDS_YOUR_INPUT } from '../../tray/attention';
import {
  APNS_PAYLOAD_MAX_BYTES,
  WAITING_THREAD,
  composeAlert,
  composeBadge
} from '../alert';

const ID_A = '0b6f1f0e-5a1c-4d7e-9a53-1f1d2c3b4a5e';
const ID_B = '6c2e9d1a-7b3f-4e8c-8d2a-9e0f1a2b3c4d';
const ID_C = 'f1e2d3c4-b5a6-4978-8695-a4b3c2d1e0f9';

const CANARY = 'CANARY-7f3e';

function row(over: Partial<PocketBlockedRow> & Pick<PocketBlockedRow, 'sessionId' | 'name'>): PocketBlockedRow {
  return {
    project: 'webapp',
    machine: null,
    agent: `claude-${CANARY}`,
    agentLabel: 'Claude Code',
    statusLabel: 'needs input',
    // Phase 316's two drawn fields are NOT on the alert's allowlist (§2.1), so
    // they carry the canary too: the alert must never read either.
    statusTitle: `Needs input ${CANARY}`,
    ageText: `2m ${CANARY}`,
    statusDot: `attention-${CANARY}`,
    question: `Allow ${CANARY} to run rm -rf?`,
    choices: [{ marker: '1', text: `Yes ${CANARY}` }] as PocketBlockedRow['choices'],
    blockedSince: 1_700_000_000_000,
    seenAtWake: false,
    ...over
  };
}

function bytes(payload: string): number {
  return Buffer.byteLength(payload, 'utf8');
}

/** No lone surrogate: a UTF-8 round trip turns one into U+FFFD, so it would not come back equal. */
function wellFormed(text: string): boolean {
  return Buffer.from(text, 'utf8').toString('utf8') === text;
}

describe('the three shapes, byte for byte (SPEC §2.3)', () => {
  it('draws a single alert as the name and the status word over the project and the agent', () => {
    const plan = composeAlert({ announce: [row({ sessionId: ID_A, name: 'writer' })], blockedCount: 1 });
    expect(plan.kind).toBe('single');
    expect(plan.payload).toBe(
      '{"aps":{"alert":{"title":"writer needs input","body":"webapp · Claude Code"},' +
        `"badge":1,"sound":"default","thread-id":"${ID_A}"},"tortie":{"v":1,"session":"${ID_A}"}}`
    );
    expect(plan.priority).toBe(10);
    expect(plan.collapseId).toBe(ID_A);
    expect(plan.ttlSeconds).toBe(3600);
  });

  it('carries the blocked count as the badge, not the announced count', () => {
    const plan = composeAlert({ announce: [row({ sessionId: ID_A, name: 'writer' })], blockedCount: 3 });
    expect(JSON.parse(plan.payload).aps.badge).toBe(3);
  });

  it('draws the machine after the agent only when there is one', () => {
    const plan = composeAlert({
      announce: [row({ sessionId: ID_A, name: 'writer', machine: 'studio' })],
      blockedCount: 1
    });
    expect(JSON.parse(plan.payload).aps.alert.body).toBe('webapp · Claude Code · studio');
  });

  it('draws two rows as one count alert, names newest first, thread and collapse the waiting thread', () => {
    const plan = composeAlert({
      announce: [row({ sessionId: ID_A, name: 'w2' }), row({ sessionId: ID_B, name: 'w1' })],
      blockedCount: 2
    });
    expect(plan.kind).toBe('count');
    expect(plan.payload).toBe(
      '{"aps":{"alert":{"title":"Needs your input (2)","body":"w2 · w1"},' +
        '"badge":2,"sound":"default","thread-id":"tortie-waiting"},"tortie":{"v":1}}'
    );
    expect(plan.collapseId).toBe(WAITING_THREAD);
    expect(plan.priority).toBe(10);
    expect(plan.ttlSeconds).toBe(3600);
  });

  it('says the wake first, and says it even for ONE row (the shape choice)', () => {
    const one = composeAlert({
      announce: [row({ sessionId: ID_A, name: 'w1', seenAtWake: true })],
      blockedCount: 1
    });
    expect(one.kind).toBe('count');
    expect(one.payload).toBe(
      '{"aps":{"alert":{"title":"Needs your input (1)","body":"Seen when your Mac woke · w1"},' +
        '"badge":1,"sound":"default","thread-id":"tortie-waiting"},"tortie":{"v":1}}'
    );
    const three = composeAlert({
      announce: [
        row({ sessionId: ID_A, name: 'w3', seenAtWake: true }),
        row({ sessionId: ID_B, name: 'w2', seenAtWake: true }),
        row({ sessionId: ID_C, name: 'w1', seenAtWake: true })
      ],
      blockedCount: 3
    });
    const alert = JSON.parse(three.payload).aps.alert;
    expect(alert.title).toBe('Needs your input (3)');
    expect(alert.body).toBe('Seen when your Mac woke · w3 · w2 · w1');
  });

  it('leaves the wake out when ANY announced row was not first seen at it (the fix round)', () => {
    // A row that joined just before the sleep folds into the wake's one alert
    // with its true stamp. "Seen when your Mac woke" would be false of it.
    const mixed = composeAlert({
      announce: [
        row({ sessionId: ID_A, name: 'w3', seenAtWake: true }),
        row({ sessionId: ID_B, name: 'w2', seenAtWake: true }),
        row({ sessionId: ID_C, name: 'p1', seenAtWake: false })
      ],
      blockedCount: 3
    });
    expect(mixed.kind).toBe('count');
    expect(JSON.parse(mixed.payload).aps.alert).toEqual({
      title: 'Needs your input (3)',
      body: 'w3 · w2 · p1'
    });
  });

  it('draws the badge-only fall with no word, no sound, priority 5 and no storage', () => {
    const plan = composeBadge(0);
    expect(plan.kind).toBe('badge');
    expect(plan.payload).toBe('{"aps":{"badge":0}}');
    expect(plan.priority).toBe(5);
    expect(plan.collapseId).toBeNull();
    expect(plan.ttlSeconds).toBe(0);
  });

  it('answers the badge shape when nothing is announced', () => {
    expect(composeAlert({ announce: [], blockedCount: 2 }).payload).toBe('{"aps":{"badge":2}}');
  });

  it('spells its two titles from the words main already owns', () => {
    expect(NEEDS_YOUR_INPUT).toBe('Needs your input');
    expect(PUSH_WAKE_SEEN).toBe('Seen when your Mac woke');
    const single = composeAlert({ announce: [row({ sessionId: ID_A, name: 'n', statusLabel: 'S' })], blockedCount: 1 });
    // The single title is the name, one space and the status word, and nothing else.
    expect(JSON.parse(single.payload).aps.alert.title).toBe('n S');
  });

  it('carries only the allowlisted keys in every shape', () => {
    const single = JSON.parse(composeAlert({ announce: [row({ sessionId: ID_A, name: 'a' })], blockedCount: 1 }).payload);
    expect(Object.keys(single)).toEqual(['aps', 'tortie']);
    expect(Object.keys(single.aps)).toEqual(['alert', 'badge', 'sound', 'thread-id']);
    expect(Object.keys(single.aps.alert)).toEqual(['title', 'body']);
    expect(Object.keys(single.tortie)).toEqual(['v', 'session']);
    const count = JSON.parse(
      composeAlert({ announce: [row({ sessionId: ID_A, name: 'a' }), row({ sessionId: ID_B, name: 'b' })], blockedCount: 2 }).payload
    );
    expect(Object.keys(count.aps)).toEqual(['alert', 'badge', 'sound', 'thread-id']);
    expect(Object.keys(count.tortie)).toEqual(['v']);
  });
});

describe('what never reaches an alert (SPEC §2.1)', () => {
  it('carries no byte of the question, the choices, the dot or the registry id', () => {
    const plans = [
      composeAlert({ announce: [row({ sessionId: ID_A, name: 'a' })], blockedCount: 1 }),
      composeAlert({ announce: [row({ sessionId: ID_A, name: 'a' }), row({ sessionId: ID_B, name: 'b' })], blockedCount: 2 }),
      composeAlert({ announce: [row({ sessionId: ID_A, name: 'a', seenAtWake: true })], blockedCount: 1 })
    ];
    for (const plan of plans) {
      expect(plan.payload).not.toContain(CANARY);
      expect(plan.payload).not.toContain('rm -rf');
      expect(plan.collapseId ?? '').not.toContain(CANARY);
    }
  });
});

describe('the ceiling (SPEC §2.4)', () => {
  const EMOJI = '\u{1F600}'; // four UTF-8 bytes, two UTF-16 units
  const CJK = '漢'; // three UTF-8 bytes, one UTF-16 unit
  const longName = (EMOJI + CJK).repeat(3334); // 10,002 UTF-16 units

  it('clips a huge single name at a whole code point, maximally, and stays valid', () => {
    const plan = composeAlert({ announce: [row({ sessionId: ID_A, name: longName })], blockedCount: 1 });
    expect(bytes(plan.payload)).toBeLessThanOrEqual(APNS_PAYLOAD_MAX_BYTES);
    expect(wellFormed(plan.payload)).toBe(true);
    const title: string = JSON.parse(plan.payload).aps.alert.title;
    expect(title.endsWith('… needs input')).toBe(true);
    const kept = title.slice(0, -'… needs input'.length);
    expect(longName.startsWith(kept)).toBe(true);
    // Maximal: one more code point would not fit.
    const points = Array.from(longName);
    const keptPoints = Array.from(kept).length;
    const longer = plan.payload.replace(kept + '…', points.slice(0, keptPoints + 1).join('') + '…');
    expect(bytes(longer)).toBeGreaterThan(APNS_PAYLOAD_MAX_BYTES);
    // Deterministic.
    expect(composeAlert({ announce: [row({ sessionId: ID_A, name: longName })], blockedCount: 1 }).payload).toBe(plan.payload);
  });

  it('moves on to the project, then the agent, when an empty name still does not fit', () => {
    const plan = composeAlert({
      announce: [row({ sessionId: ID_A, name: longName, project: longName })],
      blockedCount: 1
    });
    expect(bytes(plan.payload)).toBeLessThanOrEqual(APNS_PAYLOAD_MAX_BYTES);
    const alert = JSON.parse(plan.payload).aps.alert;
    expect(alert.title).toBe('… needs input');
    expect(alert.body.endsWith('… · Claude Code')).toBe(true);
    const third = composeAlert({
      announce: [row({ sessionId: ID_A, name: longName, project: longName, agentLabel: longName })],
      blockedCount: 1
    });
    expect(bytes(third.payload)).toBeLessThanOrEqual(APNS_PAYLOAD_MAX_BYTES);
    const body: string = JSON.parse(third.payload).aps.alert.body;
    expect(body.startsWith('… · ')).toBe(true);
    expect(body.endsWith('…')).toBe(true);
    expect(wellFormed(third.payload)).toBe(true);
  });

  it('drops names from the end of a count alert and says so once', () => {
    const names = Array.from({ length: 20 }, (_, i) => `session-${String(i).padStart(2, '0')}-${'x'.repeat(300)}`);
    const plan = composeAlert({
      announce: names.map((name, i) => row({ sessionId: `${ID_A.slice(0, -2)}${String(i).padStart(2, '0')}`, name })),
      blockedCount: 20
    });
    expect(bytes(plan.payload)).toBeLessThanOrEqual(APNS_PAYLOAD_MAX_BYTES);
    const alert = JSON.parse(plan.payload).aps.alert;
    expect(alert.title).toBe('Needs your input (20)');
    const body: string = alert.body;
    expect(body.endsWith(' · …')).toBe(true);
    expect(body.split(' · …').length).toBe(2);
    const kept = body.slice(0, -' · …'.length).split(' · ');
    expect(kept).toEqual(names.slice(0, kept.length));
    // Maximal: keeping one more name would not fit.
    const longer = plan.payload.replace(body, [...names.slice(0, kept.length + 1)].join(' · ') + ' · …');
    expect(bytes(longer)).toBeGreaterThan(APNS_PAYLOAD_MAX_BYTES);
  });

  it('keeps the wake segment and clips the first name when it alone does not fit', () => {
    const plan = composeAlert({
      announce: [
        row({ sessionId: ID_A, name: longName, seenAtWake: true }),
        row({ sessionId: ID_B, name: 'short', seenAtWake: true })
      ],
      blockedCount: 2
    });
    expect(bytes(plan.payload)).toBeLessThanOrEqual(APNS_PAYLOAD_MAX_BYTES);
    expect(wellFormed(plan.payload)).toBe(true);
    const body: string = JSON.parse(plan.payload).aps.alert.body;
    expect(body.startsWith(`${PUSH_WAKE_SEEN} · `)).toBe(true);
    expect(body.endsWith('… · …')).toBe(true);
  });
});
