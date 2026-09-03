/**
 * Phase 204. What a row says about an account Tortie is holding, and what it
 * says a switch will do.
 *
 * JUST ENOUGH WORDS is the rule being tested as much as the words themselves:
 * a row where a switch moves no credential says nothing new at all, so every
 * shape Phase 203 drew still reads exactly as it read.
 */

import { describe, expect, it } from 'vitest';
import type { LoginRow } from '@shared/logins';
import { defaultLoginRow } from '@shared/logins';
import {
  LOGIN_KEPT,
  LOGIN_NOT_SIGNED_IN,
  LOGIN_SWITCH_RESTORE,
  loginAccountDetail,
  loginRowDetail,
  loginSwitchLine
} from '@shared/login-copy';
import { loginMenuItems } from '../login-menu';

function row(over: Partial<LoginRow> = {}): LoginRow {
  return {
    provider: 'claude',
    name: 'Work',
    isDefault: false,
    chosen: false,
    present: true,
    email: 'work@example.com',
    kept: false,
    restores: false,
    ...over
  };
}

describe('a login whose account Tortie is holding', () => {
  it('does not say it was never signed into', () => {
    const promoted = row({ present: false, kept: true, name: 'one.example' });
    expect(loginAccountDetail(promoted)).toContain(LOGIN_KEPT);
    expect(loginAccountDetail(promoted)).not.toContain(LOGIN_NOT_SIGNED_IN);
  });

  it('still says so for a login nobody has signed into at all', () => {
    const empty = row({ present: false, kept: false, email: null });
    expect(loginAccountDetail(empty)).toContain(LOGIN_NOT_SIGNED_IN);
    expect(loginAccountDetail(empty)).not.toContain(LOGIN_KEPT);
  });
});

describe('what a switch will do, before it happens', () => {
  it('says it on the row where an account will be put back', () => {
    expect(loginSwitchLine(row({ restores: true }))).toBe(LOGIN_SWITCH_RESTORE);
  });

  it('says nothing where no credential moves', () => {
    expect(loginSwitchLine(row())).toBe('');
    expect(loginSwitchLine(row({ chosen: true, restores: true }))).toBe('');
    expect(loginSwitchLine(defaultLoginRow('claude', false, true, 'a@b.com'))).toBe('');
  });

  it('leaves every Phase 203 row reading exactly as it did', () => {
    for (const shape of [
      defaultLoginRow('claude', true, true, 'own@example.com'),
      row(),
      row({ email: null }),
      row({ present: false, email: null })
    ]) {
      expect(loginRowDetail(shape)).toBe(loginAccountDetail(shape));
    }
  });

  it('carries the line into the native menu and nowhere a name is', () => {
    const items = loginMenuItems([row({ restores: true, kept: true, present: false })]);
    const first = items[0];
    expect(first?.sublabel).toContain(LOGIN_KEPT);
    expect(first?.sublabel).toContain(LOGIN_SWITCH_RESTORE);
    // THE ID A PICK COMES BACK AS IS STILL THE NAME, which is the reserved
    // manifest key, and nothing a person reads is what the pick carries.
    expect(first?.id).toBe('login:pick:Work');
  });
});
