/**
 * The rule that decides "signed in to SpecStory Cloud" (Phase 15).
 *
 * These cases are the CLI's own, not ours: `cloud.IsAuthenticated`
 * (pkg/cloud/auth.go:220-289) accepts EITHER an unexpired access token OR an
 * unexpired refresh token, and `isTokenExpired` (auth.go:796-810) treats a
 * missing, unparseable, or within-five-minutes expiry as expired. gmux reads
 * the same file, so it has to reach the same verdict — a UI that says "signed
 * in" while the next `specstory sync` uploads nothing is worse than no UI.
 *
 * The fixture is the real auth.json shape, taken from a live install with the
 * tokens replaced.
 */

import { describe, expect, it } from 'vitest';
import {
  compareSpecStoryVersions,
  defaultCaptureAgents,
  distillCliMessage,
  evaluateSpecStoryAuth,
  isSpecStoryTokenExpired,
  normalizeSpecStoryDeviceCode,
  parseSpecStoryVersionOutput,
  SPECSTORY_PROVIDER_BY_AGENT
} from '../specstory-status';

const NOW = Date.parse('2026-08-11T20:30:00.000Z');
const iso = (offsetMs: number): string => new Date(NOW + offsetMs).toISOString();
const HOUR = 3_600_000;

function authFile(over: {
  accessExpires?: string;
  refreshExpires?: string;
  accessToken?: string;
  refreshToken?: string;
}): unknown {
  return {
    cloud_refresh: {
      token: over.refreshToken ?? 'refresh-token',
      as: 'greg@specstory.com',
      createdAt: '2026-07-29T01:35:14.137Z',
      expiresAt: over.refreshExpires ?? iso(10 * 365 * 24 * HOUR),
      lastValidAt: '2026-08-11T20:26:51Z'
    },
    cloud_access: {
      token: over.accessToken ?? 'access-token',
      updatedAt: '2026-08-11T20:26:51.411Z',
      expiresAt: over.accessExpires ?? iso(HOUR)
    }
  };
}

describe('evaluateSpecStoryAuth', () => {
  it('reads a live install as signed in, with the account and both dates', () => {
    const facts = evaluateSpecStoryAuth(authFile({}), NOW);
    expect(facts).toEqual({
      signedIn: true,
      email: 'greg@specstory.com',
      since: '2026-07-29T01:35:14.137Z',
      lastCloudActivity: '2026-08-11T20:26:51Z'
    });
  });

  it('stays signed in on an expired access token — the refresh token carries it', () => {
    const facts = evaluateSpecStoryAuth(
      authFile({ accessExpires: iso(-HOUR) }),
      NOW
    );
    expect(facts.signedIn).toBe(true);
  });

  it('applies the CLI five-minute buffer: an access token expiring in 2 min is expired', () => {
    // Refresh emptied so ONLY the access token can decide the verdict.
    const nearly = authFile({
      accessExpires: iso(2 * 60_000),
      refreshToken: ''
    });
    expect(evaluateSpecStoryAuth(nearly, NOW).signedIn).toBe(false);
    const comfortable = authFile({
      accessExpires: iso(30 * 60_000),
      refreshToken: ''
    });
    expect(evaluateSpecStoryAuth(comfortable, NOW).signedIn).toBe(true);
  });

  it('reports the account even once both tokens have expired', () => {
    const facts = evaluateSpecStoryAuth(
      authFile({ accessExpires: iso(-HOUR), refreshExpires: iso(-HOUR) }),
      NOW
    );
    expect(facts.signedIn).toBe(false);
    expect(facts.email).toBe('greg@specstory.com');
  });

  it('treats an empty token as no token', () => {
    const facts = evaluateSpecStoryAuth(
      authFile({ accessToken: '', refreshToken: '' }),
      NOW
    );
    expect(facts.signedIn).toBe(false);
  });

  it('treats a missing, malformed or half-written file as signed out', () => {
    for (const raw of [null, undefined, 'not json', 42, {}, { cloud_refresh: 7 }]) {
      expect(evaluateSpecStoryAuth(raw, NOW).signedIn).toBe(false);
    }
  });

  it('falls back to the access token timestamp when lastValidAt is absent', () => {
    const raw = authFile({}) as Record<string, Record<string, unknown>>;
    delete raw['cloud_refresh']?.['lastValidAt'];
    expect(evaluateSpecStoryAuth(raw, NOW).lastCloudActivity).toBe(
      '2026-08-11T20:26:51.411Z'
    );
  });
});

describe('isSpecStoryTokenExpired', () => {
  it('counts an absent or unparseable expiry as expired', () => {
    expect(isSpecStoryTokenExpired(undefined, NOW)).toBe(true);
    expect(isSpecStoryTokenExpired('', NOW)).toBe(true);
    expect(isSpecStoryTokenExpired('soon', NOW)).toBe(true);
  });
});

describe('normalizeSpecStoryDeviceCode', () => {
  it('accepts the two formats the browser prints', () => {
    expect(normalizeSpecStoryDeviceCode('Ab1c23')).toBe('Ab1c23');
    expect(normalizeSpecStoryDeviceCode('Ab1-c23')).toBe('Ab1c23');
    expect(normalizeSpecStoryDeviceCode('  ab1c23\n')).toBe('ab1c23');
  });

  it('rejects everything else before a process is spawned', () => {
    for (const bad of ['', 'ab1c2', 'ab1c234', 'ab1_c23', 'ab-1c23', 'ab1c2!']) {
      expect(normalizeSpecStoryDeviceCode(bad)).toBeNull();
    }
  });
});

describe('version parsing', () => {
  it('pulls the version out of what the CLI actually prints', () => {
    expect(parseSpecStoryVersionOutput('2.5.0 (SpecStory)')).toBe('2.5.0');
    expect(parseSpecStoryVersionOutput('specstory version v2.7.0\n')).toBe('2.7.0');
    expect(parseSpecStoryVersionOutput('2.8.0-rc.1 (SpecStory)')).toBe('2.8.0-rc.1');
    // Observed exactly, no trailing newline, from the bundled 2.8.0; and the
    // leading whitespace a probe's combined stdout+stderr can carry.
    expect(parseSpecStoryVersionOutput('2.8.0 (SpecStory)')).toBe('2.8.0');
    expect(parseSpecStoryVersionOutput('  2.5.0 (SpecStory)\n')).toBe('2.5.0');
  });

  it('reports nothing rather than a guess for a source build', () => {
    expect(parseSpecStoryVersionOutput('dev (SpecStory)')).toBeNull();
    expect(parseSpecStoryVersionOutput('')).toBeNull();
    // The shell's answer when the binary is not there at all — this is what
    // the resolver's version probe feeds in on a machine without the CLI.
    expect(parseSpecStoryVersionOutput('command not found')).toBeNull();
  });

  it('orders numerically, not lexically', () => {
    expect(compareSpecStoryVersions('2.10.0', '2.9.0')).toBe(1);
    expect(compareSpecStoryVersions('2.5.0', '2.5.0')).toBe(0);
    expect(compareSpecStoryVersions(null, '0.0.1')).toBe(-1);
  });
});

describe('capture-capable agents', () => {
  it('lists the eight agents specstory has a provider for', () => {
    const ids = defaultCaptureAgents().map((a) => a.agentId);
    expect(ids).toEqual([
      'claude',
      'codex',
      'cursor',
      'gemini',
      'droid',
      'deepseek',
      'antigravity',
      'muse'
    ]);
  });

  it('leaves out the agents specstory cannot wrap', () => {
    // qwen and pi are launchable in gmux but have no `specstory run` provider
    // in the pinned release — offering them a capture switch would promise
    // something the CLI cannot do.
    expect(SPECSTORY_PROVIDER_BY_AGENT.qwen).toBeUndefined();
    expect(SPECSTORY_PROVIDER_BY_AGENT.pi).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// The one line a failed sign-in gets to show
// ---------------------------------------------------------------------------

/**
 * VERBATIM CAPTURE. `specstory login` (bundled 2.8.0) was fed the invalid code
 * `ZZ9QX7` on a pipe against a scratch HOME; these are the exact bytes it
 * wrote. The prompt trailing on stdout and the framing on stderr are why "take
 * the last line" was wrong: it showed the user a colon, or an EOF that gmux
 * itself had caused by closing the pipe.
 */
const REJECTED_CODE_STDOUT = [
  '',
  '🌐 Opening your browser to log in to SpecStory Cloud...',
  '',
  '📋 If your browser didn\u2019t open, please visit:',
  '   https://cloud.specstory.com/cli-login',
  '',
  "🔑 Enter the 6-character code shown in your browser (or 'quit' to cancel):",
  '   Code: ',
  '✅ Code received: ZZ9-QX7',
  '🔄 Authenticating...',
  '',
  '❌ Authentication failed: Invalid or expired device code',
  '',
  'Please try entering the code again.',
  '',
  "🔑 Enter the 6-character code shown in your browser (or 'quit' to cancel):",
  '   Code: '
].join('\n');

const REJECTED_CODE_STDERR = [
  '          ',
  '   ERROR  ',
  '          ',
  '  Failed to read authentication code: EOF.        ',
  ''
].join('\n');

describe('distillCliMessage', () => {
  it('surfaces the CLI\u2019s diagnosis, not its last printed line', () => {
    expect(distillCliMessage(REJECTED_CODE_STDOUT, REJECTED_CODE_STDERR)).toBe(
      'Authentication failed: Invalid or expired device code'
    );
  });

  it('never shows the EOF that gmux itself caused', () => {
    // Nothing else was said, so there is nothing honest to show: the caller
    // falls back to its own "SpecStory rejected the code" wording.
    expect(distillCliMessage('', REJECTED_CODE_STDERR)).toBeNull();
  });

  it('drops the prompt the CLI reprints before every read', () => {
    expect(distillCliMessage('   Code: \n', '')).toBeNull();
  });

  it('falls back to the last real line when nothing blamed anything', () => {
    expect(distillCliMessage('🔐 You\u2019re already logged in!\n', '')).toBe(
      'You\u2019re already logged in!'
    );
  });

  it('reads a bare stderr failure when stdout said nothing', () => {
    expect(distillCliMessage('', 'network unreachable\n')).toBe(
      'network unreachable'
    );
  });

  it('has no line to show for a silent run', () => {
    expect(distillCliMessage('', '')).toBeNull();
  });
});
