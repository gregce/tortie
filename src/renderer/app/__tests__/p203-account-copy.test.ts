/**
 * A login is drawn as its account (Phase 203).
 *
 * The operator's report of 2026-09-02: *"right now i'm logged into
 * greg@itavero.software but default isn't actually mapped to that in tortie"*.
 * So the address leads on every surface, `Default` stops being a label and
 * stays the manifest key, the default row is marked as the one Tortie does not
 * own, and a login with no address yet says so rather than looking broken.
 *
 * The addresses below are `example.com`, except the one line that pins the
 * operator's own reported case, which is his address as the product would draw
 * it and reaches nothing but this assertion.
 */

import { describe, expect, it } from 'vitest';
import type { LoginRow } from '@shared/logins';
import { DEFAULT_LOGIN_NAME, defaultLoginRow } from '@shared/logins';
import {
  LOGIN_ACCOUNT_UNKNOWN,
  LOGIN_NOT_SIGNED_IN,
  LOGIN_YOUR_OWN,
  loginAccountDetail,
  loginAccountLabel,
  loginSignInDoneLine
} from '@shared/login-copy';
import { emptyUsageProvider } from '@shared/usage';
import { usageLoginLine } from '../usage-copy';
import { cardLines, loginEmailOf } from '../UsageMeter';

function added(over: Partial<LoginRow> = {}): LoginRow {
  return {
    provider: 'claude',
    name: 'Work',
    isDefault: false,
    chosen: false,
    present: true,
    email: null,
    kept: false,
    restores: false,
    ...over
  };
}

describe('the six shapes a login row can take', () => {
  it('default, signed in, address known: the address, marked as his own', () => {
    const row = defaultLoginRow('claude', true, true, 'greg@itavero.software');
    expect(loginAccountLabel(row)).toBe('greg@itavero.software');
    expect(loginAccountDetail(row)).toBe(LOGIN_YOUR_OWN);
  });

  it('default, signed in, no address: the phrase, and the honest second line', () => {
    const row = defaultLoginRow('codex', true, true, null);
    expect(loginAccountLabel(row)).toBe(LOGIN_YOUR_OWN);
    expect(loginAccountDetail(row)).toBe(LOGIN_ACCOUNT_UNKNOWN);
  });

  it('default, not signed in: the phrase, and the missing sign in', () => {
    const row = defaultLoginRow('claude', true, false, null);
    expect(loginAccountLabel(row)).toBe(LOGIN_YOUR_OWN);
    expect(loginAccountDetail(row)).toBe(LOGIN_NOT_SIGNED_IN);
  });

  it('added, signed in, address known: the address, the name beside it', () => {
    const row = added({ email: 'work@example.com' });
    expect(loginAccountLabel(row)).toBe('work@example.com');
    expect(loginAccountDetail(row)).toBe('Work');
  });

  it('added, signed in, no address yet: the name, and the honest second line', () => {
    const row = added();
    expect(loginAccountLabel(row)).toBe('Work');
    expect(loginAccountDetail(row)).toBe(LOGIN_ACCOUNT_UNKNOWN);
  });

  it('added, not signed in: the name, and the missing sign in', () => {
    const row = added({ present: false });
    expect(loginAccountLabel(row)).toBe('Work');
    expect(loginAccountDetail(row)).toBe(LOGIN_NOT_SIGNED_IN);
  });

  it('never draws the reserved manifest key on a face', () => {
    for (const row of [
      defaultLoginRow('claude', true, true, 'a@example.com'),
      defaultLoginRow('claude', true, true, null),
      defaultLoginRow('claude', true, false, null)
    ]) {
      expect(loginAccountLabel(row)).not.toContain(DEFAULT_LOGIN_NAME);
      expect(loginAccountDetail(row)).not.toContain(DEFAULT_LOGIN_NAME);
      // AND THE NAME IS STILL THERE, underneath, because it is what a launch
      // resolves and what a manifest row carries. There is no rename.
      expect(row.name).toBe(DEFAULT_LOGIN_NAME);
    }
  });
});

describe('the sentence a finished sign in ends with', () => {
  it('names the login and the account when a credential now exists', () => {
    expect(loginSignInDoneLine('Work', added({ email: 'work@example.com' }))).toBe(
      'Signed in on Work as work@example.com.'
    );
  });

  it('names the login alone when the vendor has named no address yet', () => {
    expect(loginSignInDoneLine('Work', added())).toBe('Signed in on Work.');
  });

  it('says nothing was written when no credential exists', () => {
    expect(loginSignInDoneLine('Work', added({ present: false }))).toBe(
      'Work is still not signed in. Nothing was written.'
    );
    expect(loginSignInDoneLine('Work', null)).toBe(
      'Work is still not signed in. Nothing was written.'
    );
  });
});

describe('the meter card names the account', () => {
  it('names the address for the default login, which is the second defect', () => {
    const p = { ...emptyUsageProvider('claude', 'ok'), login: null };
    expect(usageLoginLine(p.login)).toBe('');
    expect(usageLoginLine(p.login, 'greg@itavero.software')).toBe(
      'Login: greg@itavero.software'
    );
    expect(cardLines(p, 0, new Map(), 'greg@itavero.software')).toContain(
      'Login: greg@itavero.software'
    );
  });

  it('falls back to the login Tortie holds when no address is known', () => {
    const p = { ...emptyUsageProvider('claude', 'ok'), login: 'Work' };
    expect(cardLines(p, 0)).toContain('Login: Work');
  });

  it('joins the meter row to the login list by identity and not by a word', () => {
    const snapshot = {
      logins: [
        defaultLoginRow('claude', false, true, 'own@example.com'),
        added({ email: 'work@example.com', chosen: true }),
        defaultLoginRow('codex', true, true, null)
      ],
      problems: [],
      at: 0
    };
    const own = { ...emptyUsageProvider('claude', 'ok'), login: null };
    const work = { ...emptyUsageProvider('claude', 'ok'), login: 'Work' };
    const codex = { ...emptyUsageProvider('codex', 'ok'), login: null };
    expect(loginEmailOf(snapshot, own)).toBe('own@example.com');
    expect(loginEmailOf(snapshot, work)).toBe('work@example.com');
    expect(loginEmailOf(snapshot, codex)).toBeNull();
    // A login the list does not hold is not an address, and not a crash.
    expect(
      loginEmailOf(snapshot, { ...emptyUsageProvider('claude', 'ok'), login: 'Gone' })
    ).toBeNull();
  });
});
