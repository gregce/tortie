/**
 * The credential readers (Phase 181). Every seam is injected, so this file
 * opens no keychain, reads nothing under anybody's home and spawns nothing.
 *
 * The tokens below are the literal word for a token. No real credential, no
 * fragment of one and no identifier from the operator's machine is here.
 */

import { describe, expect, it } from 'vitest';
import type { CredentialDeps } from '../credentials';
import {
  CLAUDE_KEYCHAIN_SERVICE,
  claudeScopedService,
  readClaudeCredential,
  readCodexCredential
} from '../credentials';

function deps(over: Partial<CredentialDeps> = {}): {
  deps: CredentialDeps;
  asked: string[];
  read: string[];
} {
  const asked: string[] = [];
  const read: string[] = [];
  const base: CredentialDeps = {
    keychain: async (service) => {
      asked.push(service);
      return null;
    },
    readText: async (path) => {
      read.push(path);
      return null;
    },
    env: {},
    home: '/Users/example',
    ...over
  };
  return { deps: base, asked, read };
}

const CLAUDE_PAYLOAD = JSON.stringify({
  claudeAiOauth: {
    accessToken: 'ACCESS',
    refreshToken: 'REFRESH',
    expiresAt: 1,
    refreshTokenExpiresAt: 2,
    scopes: ['a', 'b', 'c', 'd', 'e'],
    subscriptionType: 'plan',
    rateLimitTier: 'tier'
  },
  mcpOAuth: { 'some-server': { accessToken: 'MCP_TOKEN' } }
});

describe('the Claude credential reader', () => {
  it('asks the PLAIN service name when no config dir is set', async () => {
    const bag = deps();
    bag.deps.keychain = async (service) => {
      bag.asked.push(service);
      return CLAUDE_PAYLOAD;
    };
    await readClaudeCredential(bag.deps);
    expect(bag.asked).toEqual([CLAUDE_KEYCHAIN_SERVICE]);
    expect(await readClaudeCredential(bag.deps)).toEqual({
      kind: 'ok',
      token: 'ACCESS',
      accountId: null,
      plan: 'plan'
    });
  });

  it('tries the scoped name FIRST and the plain one anyway when a config dir is set', async () => {
    const bag = deps({ env: { CLAUDE_CONFIG_DIR: '/tmp/cfg' } });
    await readClaudeCredential(bag.deps);
    expect(bag.asked).toEqual([
      claudeScopedService('/tmp/cfg'),
      CLAUDE_KEYCHAIN_SERVICE
    ]);
  });

  it('falls through to the file when the keychain has nothing', async () => {
    const bag = deps();
    bag.deps.readText = async (path) => {
      bag.read.push(path);
      return CLAUDE_PAYLOAD;
    };
    const out = await readClaudeCredential(bag.deps);
    expect(out).toEqual({
      kind: 'ok',
      token: 'ACCESS',
      accountId: null,
      plan: 'plan'
    });
    expect(bag.read).toEqual(['/Users/example/.claude/.credentials.json']);
  });

  it('reads claudeAiOauth and never mcpOAuth', async () => {
    const out = await readClaudeCredential(
      deps({ keychain: async () => CLAUDE_PAYLOAD }).deps
    );
    expect(JSON.stringify(out)).not.toContain('MCP_TOKEN');
  });

  it('says missing, and never signed out, on a payload that does not parse', async () => {
    const out = await readClaudeCredential(
      deps({ keychain: async () => 'not json at all' }).deps
    );
    expect(out).toEqual({ kind: 'missing' });
  });

  it('says missing when the keychain is empty and no file exists', async () => {
    expect(await readClaudeCredential(deps().deps)).toEqual({ kind: 'missing' });
  });
});

describe('the Codex credential reader', () => {
  const auth = (over: Record<string, unknown> = {}): string =>
    JSON.stringify({
      auth_mode: 'chatgpt',
      OPENAI_API_KEY: null,
      tokens: {
        id_token: 'ID',
        access_token: 'ACCESS',
        refresh_token: 'REFRESH',
        account_id: 'ACCOUNT'
      },
      last_refresh: '2026-08-31T10:00:00Z',
      ...over
    });

  it('reads the access token and the account id out of auth.json', async () => {
    const bag = deps();
    bag.deps.readText = async (path) => {
      bag.read.push(path);
      return auth();
    };
    expect(await readCodexCredential(bag.deps)).toEqual({
      kind: 'ok',
      token: 'ACCESS',
      accountId: 'ACCOUNT',
      plan: null
    });
    expect(bag.read).toEqual(['/Users/example/.codex/auth.json']);
  });

  it('answers api key billing when OPENAI_API_KEY is present', async () => {
    const out = await readCodexCredential(
      deps({ readText: async () => auth({ OPENAI_API_KEY: 'sk-EXAMPLE' }) }).deps
    );
    expect(out).toEqual({ kind: 'api-key' });
  });

  it('honours CODEX_HOME', async () => {
    const bag = deps({ env: { CODEX_HOME: '/tmp/codex' } });
    await readCodexCredential(bag.deps);
    expect(bag.read).toEqual(['/tmp/codex/auth.json']);
  });

  it('says missing on no file, bad json, or a half filled tokens object', async () => {
    expect(await readCodexCredential(deps().deps)).toEqual({ kind: 'missing' });
    expect(
      await readCodexCredential(deps({ readText: async () => '{' }).deps)
    ).toEqual({ kind: 'missing' });
    expect(
      await readCodexCredential(
        deps({ readText: async () => auth({ tokens: { access_token: 'A' } }) }).deps
      )
    ).toEqual({ kind: 'missing' });
  });
});
