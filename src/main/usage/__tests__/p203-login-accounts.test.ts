/**
 * Whose sign in a login is, and whether it has one (Phase 203).
 *
 * Every seam is injected, so this file opens no keychain, reads nothing under
 * anybody's home and spawns nothing. The id tokens below are three dots and a
 * base64 payload this file composed; no real credential, no fragment of one
 * and no identifier from the operator's machine is here.
 */

import { describe, expect, it } from 'vitest';
import type { LoginAccountDeps } from '../login-accounts';
import {
  ACCOUNT_UNKNOWN,
  LOGIN_FACTS_TTL_MS,
  claudeAccountFileFor,
  claudeCredentialFileFor,
  claudeServicesFor,
  codexAuthFileFor,
  emailFromClaudeJson,
  emailFromCodexAuth,
  emailFromIdToken,
  forgetLoginAccounts,
  loginFacts,
  readLoginAccount,
  readLoginPresence,
  sanitizeAccountEmail,
  setLoginAccountDeps
} from '../login-accounts';
import { claudeScopedService } from '../credentials';

/** A token shaped string whose payload is whatever claims are handed in. */
function idToken(claims: unknown): string {
  const payload = Buffer.from(JSON.stringify(claims), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.signature`;
}

function deps(over: Partial<LoginAccountDeps> = {}): {
  deps: LoginAccountDeps;
  asked: string[];
  opened: string[];
  read: string[];
} {
  const asked: string[] = [];
  const opened: string[] = [];
  const read: string[] = [];
  // THE RECORDING WRAPS THE OVERRIDE rather than being replaced by it, so a
  // test that decides an answer still sees what was asked for.
  const base: LoginAccountDeps = {
    keychainHas: async (service) => {
      asked.push(service);
      return over.keychainHas === undefined ? false : over.keychainHas(service);
    },
    exists: async (path) => {
      opened.push(path);
      return over.exists === undefined ? false : over.exists(path);
    },
    readText: async (path) => {
      read.push(path);
      return over.readText === undefined ? null : over.readText(path);
    },
    env: over.env ?? {},
    home: over.home ?? '/Users/person',
    now: over.now ?? ((): number => 1_000)
  };
  return { deps: base, asked, opened, read };
}

describe('sanitizeAccountEmail', () => {
  it('lets a plain address through', () => {
    expect(sanitizeAccountEmail('greg@itavero.software')).toBe('greg@itavero.software');
    expect(sanitizeAccountEmail('  a.b-c@example.co.uk  ')).toBe('a.b-c@example.co.uk');
  });

  it('refuses markup, whitespace, quotes and a value that is not a string', () => {
    for (const bad of [
      '<b>a@b.com</b>',
      'a@b.com<script>alert(1)</script>',
      'a b@c.com',
      'a"b@c.com',
      "a'b@c.com",
      'a\\b@c.com',
      'a@b',
      'nobody',
      '',
      '@b.com',
      `${'x'.repeat(300)}@b.com`,
      42,
      null,
      undefined,
      { emailAddress: 'a@b.com' }
    ]) {
      expect(sanitizeAccountEmail(bad)).toBeNull();
    }
  });
});

describe('emailFromClaudeJson', () => {
  it('reads oauthAccount.emailAddress', () => {
    const text = JSON.stringify({
      numStartups: 9,
      oauthAccount: { emailAddress: 'greg@itavero.software', organizationName: 'Ita Vero' }
    });
    expect(emailFromClaudeJson(text)).toBe('greg@itavero.software');
  });

  it('answers null for a freshly added login, which has no oauthAccount', () => {
    const text = JSON.stringify({ numStartups: 1, installMethod: 'native' });
    expect(emailFromClaudeJson(text)).toBeNull();
  });

  it('answers null rather than throwing for bytes that are not JSON', () => {
    expect(emailFromClaudeJson('not json at all')).toBeNull();
    expect(emailFromClaudeJson('[]')).toBeNull();
    expect(emailFromClaudeJson('null')).toBeNull();
    expect(emailFromClaudeJson(JSON.stringify({ oauthAccount: 'a string' }))).toBeNull();
    expect(
      emailFromClaudeJson(JSON.stringify({ oauthAccount: { emailAddress: 12 } }))
    ).toBeNull();
  });
});

describe('emailFromIdToken', () => {
  it('reads the plain email claim', () => {
    expect(emailFromIdToken(idToken({ email: 'gregce@example.com' }))).toBe(
      'gregce@example.com'
    );
  });

  it('falls back to the profile claim OpenAI puts beside it', () => {
    const token = idToken({
      sub: 'user-abc',
      'https://api.openai.com/profile': { email: 'gregce@example.com' }
    });
    expect(emailFromIdToken(token)).toBe('gregce@example.com');
  });

  it('is an account that is not known rather than a crash', () => {
    expect(emailFromIdToken(undefined)).toBeNull();
    expect(emailFromIdToken(12)).toBeNull();
    expect(emailFromIdToken('one.part')).toBeNull();
    expect(emailFromIdToken('a.b.c.d')).toBeNull();
    expect(emailFromIdToken('header..signature')).toBeNull();
    expect(emailFromIdToken('header.@@@not-base64-json@@@.signature')).toBeNull();
    expect(emailFromIdToken(idToken({ sub: 'nobody' }))).toBeNull();
    expect(emailFromIdToken(idToken({ email: 5 }))).toBeNull();
    expect(emailFromIdToken(idToken({ email: '<b>a@b.com</b>' }))).toBeNull();
  });

  it('keeps no part of the token, which is what the address must not carry', () => {
    const token = idToken({ email: 'gregce@example.com', access: 'SENTINEL-TOKEN' });
    const email = emailFromIdToken(token);
    expect(email).toBe('gregce@example.com');
    expect(email).not.toContain('SENTINEL-TOKEN');
    expect(email).not.toContain(token.split('.')[1]);
  });
});

describe('emailFromCodexAuth', () => {
  it('reads the id token claim, which is codex parity with claude', () => {
    const text = JSON.stringify({
      OPENAI_API_KEY: null,
      tokens: { id_token: idToken({ email: 'gregce@example.com' }), access_token: 'x' }
    });
    expect(emailFromCodexAuth(text)).toBe('gregce@example.com');
  });

  it('answers null for a file with no tokens object', () => {
    expect(emailFromCodexAuth(JSON.stringify({ OPENAI_API_KEY: 'sk-x' }))).toBeNull();
    expect(emailFromCodexAuth('{')).toBeNull();
  });
});

describe('where each file is', () => {
  it('spells the DEFAULT claude account file apart from the credential file', () => {
    const { deps: d } = deps();
    // THE DECOY. `~/.claude/.claude.json` exists and holds no oauthAccount, so
    // composing the account file the way the credential file is composed is
    // defect two reintroduced inside its own fix.
    expect(claudeAccountFileFor(d, null)).toBe('/Users/person/.claude.json');
    expect(claudeCredentialFileFor(d, null)).toBe(
      '/Users/person/.claude/.credentials.json'
    );
  });

  it('follows Tortie own CLAUDE_CONFIG_DIR for the default when one is set', () => {
    const { deps: d } = deps({ env: { CLAUDE_CONFIG_DIR: '/scratch/cfg' } });
    expect(claudeAccountFileFor(d, null)).toBe('/scratch/cfg/.claude.json');
    expect(claudeCredentialFileFor(d, null)).toBe('/scratch/cfg/.credentials.json');
  });

  it('puts both claude files inside a login directory', () => {
    const { deps: d } = deps();
    expect(claudeAccountFileFor(d, '/data/logins/claude/aa')).toBe(
      '/data/logins/claude/aa/.claude.json'
    );
    expect(claudeCredentialFileFor(d, '/data/logins/claude/aa')).toBe(
      '/data/logins/claude/aa/.credentials.json'
    );
  });

  it('reads codex from CODEX_HOME, the default location, or the login', () => {
    expect(codexAuthFileFor(deps().deps, null)).toBe('/Users/person/.codex/auth.json');
    expect(codexAuthFileFor(deps({ env: { CODEX_HOME: '/ch' } }).deps, null)).toBe(
      '/ch/auth.json'
    );
    expect(codexAuthFileFor(deps().deps, '/data/logins/codex/bb')).toBe(
      '/data/logins/codex/bb/auth.json'
    );
  });

  it('gives a login the scoped service and nothing else', () => {
    const { deps: d } = deps();
    expect(claudeServicesFor(d, '/data/logins/claude/aa')).toEqual([
      claudeScopedService('/data/logins/claude/aa')
    ]);
    expect(claudeServicesFor(d, null)).toEqual(['Claude Code-credentials']);
    expect(claudeServicesFor(deps({ env: { CLAUDE_CONFIG_DIR: '/c' } }).deps, null)).toEqual(
      [claudeScopedService('/c'), 'Claude Code-credentials']
    );
  });
});

describe('readLoginPresence', () => {
  it('is TRUE from the keychain alone, which is the whole first defect', async () => {
    const dir = '/data/logins/claude/3215d54b2ba60318';
    const { deps: d, asked, opened } = deps({
      keychainHas: async (service) => service === claudeScopedService(dir)
    });
    expect(await readLoginPresence(d, 'claude', dir)).toBe(true);
    expect(asked).toEqual([claudeScopedService(dir)]);
    // AND NO FILE WAS OPENED, because the keychain already answered.
    expect(opened).toEqual([]);
  });

  it('falls through to the credentials file when the keychain has nothing', async () => {
    const dir = '/data/logins/claude/aa';
    const { deps: d, opened } = deps({ exists: async () => true });
    expect(await readLoginPresence(d, 'claude', dir)).toBe(true);
    expect(opened).toEqual([`${dir}/.credentials.json`]);
  });

  it('is FALSE for a login with neither', async () => {
    expect(await readLoginPresence(deps().deps, 'claude', '/d/x')).toBe(false);
    expect(await readLoginPresence(deps().deps, 'codex', '/d/x')).toBe(false);
  });

  it('opens no keychain for codex and never reads the token file', async () => {
    const { deps: d, asked, read, opened } = deps({ exists: async () => true });
    expect(await readLoginPresence(d, 'codex', '/data/logins/codex/bb')).toBe(true);
    expect(asked).toEqual([]);
    expect(read).toEqual([]);
    expect(opened).toEqual(['/data/logins/codex/bb/auth.json']);
  });
});

describe('readLoginAccount', () => {
  it('spawns nothing and reads exactly one file per login', async () => {
    const { deps: d, asked, read } = deps({
      readText: async (path) =>
        path === '/data/logins/claude/aa/.claude.json'
          ? JSON.stringify({ oauthAccount: { emailAddress: 'work@example.com' } })
          : null
    });
    expect(await readLoginAccount(d, 'claude', '/data/logins/claude/aa')).toEqual({
      kind: 'known',
      email: 'work@example.com'
    });
    expect(asked).toEqual([]);
    expect(read).toEqual(['/data/logins/claude/aa/.claude.json']);
  });

  it('is not known for a login whose file is missing or has no address', async () => {
    expect(await readLoginAccount(deps().deps, 'claude', '/d/x')).toEqual(ACCOUNT_UNKNOWN);
    const { deps: d } = deps({ readText: async () => JSON.stringify({ numStartups: 1 }) });
    expect(await readLoginAccount(d, 'claude', '/d/x')).toEqual(ACCOUNT_UNKNOWN);
  });
});

describe('loginFacts', () => {
  it('holds one reading per login for the freshness window', async () => {
    let calls = 0;
    let clock = 1_000;
    setLoginAccountDeps({
      ...deps().deps,
      keychainHas: async () => {
        calls += 1;
        return true;
      },
      now: () => clock
    });
    try {
      expect((await loginFacts('claude', '/d/a')).present).toBe(true);
      expect((await loginFacts('claude', '/d/a')).present).toBe(true);
      expect(calls).toBe(1);
      // A second login is its own reading rather than the first one reused.
      await loginFacts('claude', '/d/b');
      expect(calls).toBe(2);
      clock += LOGIN_FACTS_TTL_MS + 1;
      await loginFacts('claude', '/d/a');
      expect(calls).toBe(3);
    } finally {
      setLoginAccountDeps(null);
    }
  });

  it('keeps the last answer when a read throws rather than saying signed out', async () => {
    let fail = false;
    setLoginAccountDeps({
      ...deps().deps,
      keychainHas: async () => {
        if (fail) throw new Error('the keychain is busy');
        return true;
      },
      now: () => (fail ? 99_000 : 1_000)
    });
    try {
      expect((await loginFacts('claude', '/d/a')).present).toBe(true);
      fail = true;
      expect((await loginFacts('claude', '/d/a')).present).toBe(true);
    } finally {
      setLoginAccountDeps(null);
    }
  });

  it('forgets everything when a person changes the set', async () => {
    let answer = true;
    setLoginAccountDeps({ ...deps().deps, keychainHas: async () => answer });
    try {
      expect((await loginFacts('claude', '/d/a')).present).toBe(true);
      answer = false;
      forgetLoginAccounts();
      expect((await loginFacts('claude', '/d/a')).present).toBe(false);
    } finally {
      setLoginAccountDeps(null);
    }
  });
});
