/**
 * The login layer on a pane's environment (Phase 202).
 *
 * THE THREE THINGS WORTH PINNING, and they are the ones a later round could
 * undo without noticing:
 *
 *   1. THE DEFAULT LOGIN ADDS NOTHING. Not a variable set to the vendor's
 *      default path, nothing at all. That is the difference between "Tortie is
 *      not involved" and "Tortie decided where your credential is", and it is
 *      what keeps every session before this phase byte for byte as it was.
 *   2. THE LOGIN OUTRANKS THE ROW'S OWN `env`. A configured agent row may set
 *      the same variable, and a person's choice in Tortie has to win, or a
 *      configuration file would decide which credential a session opens.
 *   3. THE GMUX STAMPS STILL WIN OVER EVERYTHING. Session identity is the one
 *      thing no layer may displace.
 */

import { describe, expect, it } from 'vitest';
import { LOGIN_ENV_NAME, loginProviderForAgent } from '@shared/logins';
import { loginPaneEnv, paneEnvFor } from '../launch-plan';

describe('loginPaneEnv', () => {
  it('adds nothing at all for the default login', () => {
    expect(loginPaneEnv('claude', null)).toEqual({});
    expect(loginPaneEnv('codex', null)).toEqual({});
    expect(loginPaneEnv('claude', '')).toEqual({});
  });

  it('adds nothing for an agent that has no login', () => {
    expect(loginProviderForAgent('gemini')).toBeNull();
    expect(loginProviderForAgent('shell')).toBeNull();
    expect(loginPaneEnv(null, '/anything')).toEqual({});
  });

  it('names the vendor variable, one per provider', () => {
    expect(loginPaneEnv('claude', '/u/gmux/logins/claude/aa')).toEqual({
      CLAUDE_CONFIG_DIR: '/u/gmux/logins/claude/aa'
    });
    expect(loginPaneEnv('codex', '/u/gmux/logins/codex/bb')).toEqual({
      CODEX_HOME: '/u/gmux/logins/codex/bb'
    });
    expect(LOGIN_ENV_NAME.claude).toBe('CLAUDE_CONFIG_DIR');
    expect(LOGIN_ENV_NAME.codex).toBe('CODEX_HOME');
  });
});

describe('paneEnvFor with a login', () => {
  it('is unchanged when there is no login, which is every session before this', () => {
    expect(paneEnvFor({ FORCE_COLOR: '1' }, { A: 'b' }, 'sess', {})).toEqual({
      FORCE_COLOR: '1',
      A: 'b',
      GMUX_MANAGED: '1',
      GMUX_SESSION_ID: 'sess'
    });
  });

  it('lets the login beat the row own env for the same variable', () => {
    const env = paneEnvFor(
      { CLAUDE_CONFIG_DIR: '/from/a/configured/row' },
      {},
      'sess',
      {},
      { CLAUDE_CONFIG_DIR: '/chosen/by/the/person' }
    );
    expect(env['CLAUDE_CONFIG_DIR']).toBe('/chosen/by/the/person');
  });

  it('lets the login beat a resolved passthrough of the same name', () => {
    const env = paneEnvFor(
      undefined,
      { CODEX_HOME: '/from/the/login/shell' },
      'sess',
      {},
      { CODEX_HOME: '/chosen/by/the/person' }
    );
    expect(env['CODEX_HOME']).toBe('/chosen/by/the/person');
  });

  it('never lets a login displace the session identity stamps', () => {
    const env = paneEnvFor(undefined, {}, 'sess-1', {}, {
      GMUX_SESSION_ID: 'somebody-else',
      GMUX_MANAGED: '0'
    } as Record<string, string>);
    expect(env['GMUX_SESSION_ID']).toBe('sess-1');
    expect(env['GMUX_MANAGED']).toBe('1');
  });
});
