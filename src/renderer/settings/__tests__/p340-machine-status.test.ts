/**
 * PHASE 340. What a machine row says at a glance, one row of the table at a
 * time (build/p340/SPEC.md D11 as revised by the attack, condition 139).
 *
 * Every row of the revised table is asserted here, in the table's order, with
 * the chip, its words, its hover and the next step. The arms are first match
 * wins, so a few rows are asserted with a SECOND fact that a later arm would
 * also match, which is what proves the order rather than only the arms.
 *
 * READY MEANS ANSWERING is the row this file exists for. `ready` on a row view
 * is main's `machineCanHoldSession`, which stays true after the machine goes to
 * sleep, so a row with `ready: true` and a `quiet` link must read Offline and
 * never Ready. The attack measured the draft table drawing Ready there.
 */

import { describe, expect, it } from 'vitest';
import type { MachineRowView } from '@shared/ipc';
import {
  machineFactsOf,
  machineStatusOf,
  NEXT_STEP_LABEL,
  systemName
} from '../machine-status';
import {
  CHIP_WORDS,
  PREPARE_EXPLAIN,
  PREPARING,
  STATE_SENTENCE
} from '../machines-copy';

function row(over: Partial<MachineRowView> = {}): MachineRowView {
  return {
    id: 'studio',
    label: 'studio',
    color: 'blue',
    host: 'studio.tail1a2b.ts.net',
    user: null,
    port: null,
    remoteTmuxPath: '/opt/homebrew/bin/tmux',
    state: 'confirmed',
    usable: true,
    hash: 'a'.repeat(64),
    confirmedHash: 'a'.repeat(64),
    confirmedAt: 1_760_000_000_000,
    confirmedLines: ['Machine: studio.tail1a2b.ts.net'],
    lines: ['Machine: studio.tail1a2b.ts.net'],
    refusal: null,
    warning: 'the warning main owns',
    ...over
  };
}

function signIn(
  cls: NonNullable<MachineRowView['signIn']>['class'],
  version: string | null = '3.6a'
): MachineRowView['signIn'] {
  return {
    class: cls,
    at: 1_760_000_000_000,
    version,
    headline: `headline for ${cls}.`,
    detail: `detail for ${cls}.`
  };
}

const idle = { preparing: false };

describe('the revised table, row by row, first match wins', () => {
  it('state unknown: Not usable, Review…', () => {
    const s = machineStatusOf(
      row({ state: 'unknown', usable: false, ready: true, link: 'connected' }),
      idle
    );
    expect(s).toEqual({
      chip: 'not-usable',
      word: 'Not usable',
      hover: STATE_SENTENCE.unknown,
      next: 'review',
      alarm: false
    });
  });

  it('state never: Not confirmed, Review…, even when a later arm would match', () => {
    const s = machineStatusOf(
      row({ state: 'never', usable: false, signIn: signIn('auth-refused') }),
      idle
    );
    expect(s.chip).toBe('not-confirmed');
    expect(s.word).toBe('Not confirmed');
    expect(s.hover).toBe(STATE_SENTENCE.never);
    expect(s.next).toBe('review');
  });

  it('state changed: Changed, Review…', () => {
    const s = machineStatusOf(row({ state: 'changed', usable: false }), idle);
    expect(s.chip).toBe('changed');
    expect(s.word).toBe('Changed');
    expect(s.hover).toBe(STATE_SENTENCE.changed);
    expect(s.next).toBe('review');
  });

  it('last sign in host-key-changed: Identity changed, the one alarm, no next step', () => {
    const s = machineStatusOf(
      row({ signIn: signIn('host-key-changed'), ready: true, link: 'connected' }),
      idle
    );
    expect(s.chip).toBe('identity-changed');
    expect(s.word).toBe('Identity changed');
    expect(s.alarm).toBe(true);
    expect(s.next).toBeNull();
    expect(s.hover).toBe('headline for host-key-changed. detail for host-key-changed.');
  });

  it('last sign in auth-refused or password-required: Needs a key, Set up sign-in…', () => {
    for (const cls of ['auth-refused', 'password-required'] as const) {
      const s = machineStatusOf(row({ signIn: signIn(cls) }), idle);
      expect({ cls, chip: s.chip, next: s.next, word: s.word }).toEqual({
        cls,
        chip: 'needs-key',
        next: 'set-up-sign-in',
        word: 'Needs a key'
      });
      expect(s.hover).toContain(`headline for ${cls}.`);
    }
  });

  it('last sign in version-unmeasured: New version, Review…', () => {
    const s = machineStatusOf(row({ signIn: signIn('version-unmeasured') }), idle);
    expect(s.chip).toBe('new-version');
    expect(s.word).toBe('New version');
    expect(s.next).toBe('review-version');
    expect(NEXT_STEP_LABEL['review-version']).toBe('Review…');
  });

  it('a Prepare in flight here, or link connecting: Connecting, no next step', () => {
    const inFlight = machineStatusOf(row({ ready: true, link: 'connected' }), {
      preparing: true
    });
    expect(inFlight.chip).toBe('connecting');
    expect(inFlight.next).toBeNull();
    expect(inFlight.hover).toBe(PREPARING);
    const linking = machineStatusOf(
      row({ link: 'connecting', linkDetail: 'Tortie is signing in to studio.' }),
      idle
    );
    expect(linking.chip).toBe('connecting');
    expect(linking.word).toBe('Connecting');
    expect(linking.hover).toBe('Tortie is signing in to studio.');
  });

  it('ready AND link connected or polling: Ready, Open a folder on it…', () => {
    for (const link of ['connected', 'polling'] as const) {
      const s = machineStatusOf(row({ ready: true, link }), idle);
      expect({ link, chip: s.chip, next: s.next, word: s.word }).toEqual({
        link,
        chip: 'ready',
        next: 'open-folder',
        word: 'Ready'
      });
    }
    expect(NEXT_STEP_LABEL['open-folder']).toBe('Open a folder on it…');
  });

  it('READY MEANS ANSWERING: ready true with link quiet reads Offline, never Ready', () => {
    const s = machineStatusOf(row({ ready: true, link: 'quiet' }), idle);
    expect(s.chip).toBe('offline');
    expect(s.chip).not.toBe('ready');
    expect(s.next).toBe('prepare');
  });

  it('ready true with no link at all is never Ready either', () => {
    // A row view from a main that sent no link: absent reads as unknown.
    expect(machineStatusOf(row({ ready: true }), idle).chip).toBe('not-ready');
    expect(machineStatusOf(row({ ready: true, link: null }), idle).chip).toBe('not-ready');
  });

  it('a link connected while ready is false is not Ready', () => {
    expect(machineStatusOf(row({ ready: false, link: 'connected' }), idle).chip).toBe(
      'not-ready'
    );
  });

  it('last sign in unreachable, refused, not-resolved or timed-out: Offline, Prepare', () => {
    for (const cls of ['unreachable', 'refused', 'not-resolved', 'timed-out'] as const) {
      const s = machineStatusOf(row({ signIn: signIn(cls) }), idle);
      expect({ cls, chip: s.chip, next: s.next }).toEqual({
        cls,
        chip: 'offline',
        next: 'prepare'
      });
      expect(s.hover).toBe(`headline for ${cls}. detail for ${cls}.`);
    }
  });

  it('link quiet with no sign in: Offline, with main’s link sentence as its hover', () => {
    const s = machineStatusOf(
      row({ link: 'quiet', linkDetail: 'studio did not answer.' }),
      idle
    );
    expect(s.chip).toBe('offline');
    expect(s.word).toBe('Offline');
    expect(s.hover).toBe('studio did not answer.');
  });

  it('THE HOVER SAYS WHAT THE CHIP SAYS: a prepared machine gone quiet is explained by the link (the fix round)', () => {
    // The verifiers read, live, a chip of Offline whose hover was the last
    // sign in's "This machine is ready." A sign in explains Offline only when
    // it is the one that did not answer.
    const s = machineStatusOf(
      row({
        ready: true,
        link: 'quiet',
        linkDetail: 'studio did not answer the last time Tortie asked.',
        signIn: signIn('prepared')
      }),
      idle
    );
    expect(s.chip).toBe('offline');
    expect(s.hover).toBe('studio did not answer the last time Tortie asked.');
    expect(s.hover).not.toContain('headline for prepared');
    // With no link sentence, Prepare's own, never the prepared sign in's.
    const bare = machineStatusOf(row({ ready: true, link: 'quiet', signIn: signIn('prepared') }), idle);
    expect(bare.hover).toBe(PREPARE_EXPLAIN);
    // A sign in that did not answer still explains it, link quiet or not.
    const off = machineStatusOf(
      row({ link: 'quiet', linkDetail: 'studio did not answer.', signIn: signIn('unreachable') }),
      idle
    );
    expect(off.hover).toBe('headline for unreachable. detail for unreachable.');
  });

  it('Not ready after a prepared sign in reads Prepare’s sentence, never "ready" (the fix round)', () => {
    const s = machineStatusOf(row({ ready: false, link: 'connected', signIn: signIn('prepared') }), idle);
    expect(s.chip).toBe('not-ready');
    expect(s.hover).toBe(PREPARE_EXPLAIN);
  });

  it('a key sign in a check of this row has since answered ok past reads on to Prepare (the fix round)', () => {
    // The verifiers fixed the key some other way and checked again: the check
    // answered ok and the row still read Needs a key, whose next step only
    // checks again, with Ready two presses away. The finished ok check makes
    // that sign in stale, and the row reads on.
    const signedAt = 1_760_000_000_000; // signIn()'s own `at`
    for (const cls of ['auth-refused', 'password-required'] as const) {
      const stale = machineStatusOf(
        row({ ready: false, link: 'connected', signIn: signIn(cls) }),
        { preparing: false, checkedOkAt: signedAt + 5_000 }
      );
      expect({ cls, chip: stale.chip, next: stale.next, hover: stale.hover }).toEqual({
        cls,
        chip: 'not-ready',
        next: 'prepare',
        hover: PREPARE_EXPLAIN
      });
      // Without that check it is still Needs a key.
      expect(machineStatusOf(row({ signIn: signIn(cls) }), idle).chip).toBe('needs-key');
      // A sign in refused AFTER the check (a Prepare that could not use a key
      // the check's person answered for) is not stale: Needs a key again.
      expect(
        machineStatusOf(row({ signIn: signIn(cls) }), { preparing: false, checkedOkAt: signedAt - 5_000 }).chip
      ).toBe('needs-key');
    }
    // Only a key sign in is made stale by it: an alarm is never cleared so.
    expect(
      machineStatusOf(row({ signIn: signIn('host-key-changed') }), { preparing: false, checkedOkAt: signedAt + 5_000 }).chip
    ).toBe('identity-changed');
  });

  it('THE CHIP AGREES WITH THE CHECK SHOWN: nothing older than an ok check reads Offline (the ruled round)', () => {
    // The reverify: a key fixed some other way, then a check of this row that
    // answered ok, and the chip read Offline, "did not answer", beside the
    // check's own "This machine answered", over a link left quiet from before.
    const signedAt = 1_760_000_000_000; // signIn()'s own `at`
    const after = { preparing: false, checkedOkAt: signedAt + 5_000 };
    const quiet = { link: 'quiet' as const, linkDetail: 'studio did not answer the last time Tortie asked.' };
    for (const cls of ['auth-refused', 'password-required'] as const) {
      const s = machineStatusOf(row({ ...quiet, signIn: signIn(cls) }), after);
      expect({ cls, chip: s.chip, next: s.next, hover: s.hover }).toEqual({
        cls,
        chip: 'not-ready',
        next: 'prepare',
        hover: PREPARE_EXPLAIN
      });
    }
    // No sign-in in this run, a quiet link, and an ok check shown.
    const none = machineStatusOf(row(quiet), { preparing: false, checkedOkAt: signedAt });
    expect({ chip: none.chip, next: none.next, hover: none.hover }).toEqual({
      chip: 'not-ready',
      next: 'prepare',
      hover: PREPARE_EXPLAIN
    });
    // A sign-in that did not reach the machine, older than the check, is
    // stale the way a key one is.
    for (const cls of ['unreachable', 'refused', 'not-resolved', 'timed-out'] as const) {
      const s = machineStatusOf(row({ ...quiet, signIn: signIn(cls) }), after);
      expect({ cls, chip: s.chip, next: s.next }).toEqual({ cls, chip: 'not-ready', next: 'prepare' });
    }
    // Without the check, the link is read as before: Offline.
    expect(machineStatusOf(row(quiet), idle).chip).toBe('offline');
    // A sign-in AFTER the check that did not reach the machine is newer than
    // it, and reads Offline again.
    const later = { preparing: false, checkedOkAt: signedAt - 5_000 };
    expect(machineStatusOf(row({ ...quiet, signIn: signIn('unreachable') }), later).chip).toBe('offline');
    // And with a sign-in AFTER the check that was prepared, a quiet link is
    // the newer word, so Offline stands.
    expect(machineStatusOf(row({ ...quiet, signIn: signIn('prepared') }), later).chip).toBe('offline');
    // The check changes nothing for a machine that answers: Ready stays Ready.
    expect(
      machineStatusOf(row({ ready: true, link: 'polling', signIn: signIn('prepared') }), after).chip
    ).toBe('ready');
    // And an alarm is never cleared so.
    expect(machineStatusOf(row({ ...quiet, signIn: signIn('host-key-changed') }), after).chip).toBe(
      'identity-changed'
    );
  });

  it('otherwise: Not ready, Prepare this machine, with PREPARE_EXPLAIN as its hover', () => {
    const none = machineStatusOf(row(), idle);
    expect(none.chip).toBe('not-ready');
    expect(none.word).toBe('Not ready');
    expect(none.next).toBe('prepare');
    expect(none.hover).toBe(PREPARE_EXPLAIN);
    expect(NEXT_STEP_LABEL.prepare).toBe('Prepare this machine');
    for (const cls of [
      'no-program',
      'no-server',
      'unknown',
      'client-missing',
      'client-failed'
    ] as const) {
      const s = machineStatusOf(row({ signIn: signIn(cls) }), idle);
      expect({ cls, chip: s.chip, next: s.next }).toEqual({
        cls,
        chip: 'not-ready',
        next: 'prepare'
      });
      // Main's last sign in headline and detail, when there is one.
      expect(s.hover).toBe(`headline for ${cls}. detail for ${cls}.`);
    }
  });

  it('draws every chip word from one table, and the alarm on one chip only', () => {
    const chips = Object.keys(CHIP_WORDS).sort();
    expect(chips).toEqual(
      [
        'changed',
        'connecting',
        'identity-changed',
        'needs-key',
        'new-version',
        'not-confirmed',
        'not-ready',
        'not-usable',
        'offline',
        'ready'
      ].sort()
    );
  });
});

describe('the facts line', () => {
  it('is the address alone when nothing else is known in this run', () => {
    expect(machineFactsOf(row())).toEqual(['studio.tail1a2b.ts.net']);
  });

  it('adds the system, drawn as macOS for Darwin, and the version', () => {
    expect(
      machineFactsOf(row({ os: 'Darwin', signIn: signIn('prepared', '3.6a') }))
    ).toEqual(['studio.tail1a2b.ts.net', 'macOS', '3.6a']);
    expect(machineFactsOf(row({ os: 'Linux' }))).toEqual([
      'studio.tail1a2b.ts.net',
      'Linux'
    ]);
  });

  it('reads an empty or absent system as unknown', () => {
    expect(systemName(null)).toBeNull();
    expect(systemName(undefined)).toBeNull();
    expect(systemName('  ')).toBeNull();
    expect(systemName('darwin')).toBe('macOS');
    expect(systemName('FreeBSD')).toBe('FreeBSD');
  });
});

describe('the Ready arm, read as text (condition 139)', () => {
  it('names ready and both answering links on one arm', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(resolve(__dirname, '../machine-status.ts'), 'utf8');
    const at = source.indexOf("return status(\n      'ready'");
    expect(at).toBeGreaterThan(-1);
    const arm = source.slice(source.lastIndexOf('if (', at), at);
    expect(arm).toContain('row.ready === true');
    expect(arm).toContain("link === 'connected'");
    expect(arm).toContain("link === 'polling'");
  });
});
