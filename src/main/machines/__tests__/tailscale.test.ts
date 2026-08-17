/**
 * Where the picker gets its names, and where it refuses to get them.
 *
 * Two properties. The parse is pure and survives a tailnet with a self, an
 * online peer, an offline peer and a peer with no DNS name. The resolution is
 * pinned: a packaged build ignores the development override, and a development
 * build refuses an override that is not an absolute executable file.
 *
 * A bare `tailscale` served by PATH is never used. That is asserted here by the
 * candidate list, and it is asserted structurally by the conformance gate.
 */

import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TAILSCALE_CANDIDATES,
  parseTailscaleStatus,
  resetTailscaleWarningsForTests,
  resolveTailscale
} from '../tailscale';

const STATUS = JSON.stringify({
  Self: {
    HostName: 'greg-mac',
    DNSName: 'greg-mac.tail1a2b.ts.net.',
    OS: 'macOS',
    Online: true
  },
  Peer: {
    'nodekey:aaa': {
      HostName: 'pop-os',
      DNSName: 'pop-os.tail1a2b.ts.net.',
      OS: 'linux',
      Online: true
    },
    'nodekey:bbb': {
      HostName: 'attic',
      DNSName: 'attic.tail1a2b.ts.net.',
      OS: 'linux',
      Online: false
    },
    'nodekey:ccc': {
      HostName: 'no-dns-name',
      DNSName: '',
      OS: 'linux',
      Online: true
    }
  }
});

describe('the parse', () => {
  it('reads self first, then the peers by name', () => {
    const rows = parseTailscaleStatus(STATUS);
    expect(rows.map((r) => r.name)).toEqual([
      'greg-mac',
      'attic',
      'no-dns-name',
      'pop-os'
    ]);
  });

  it('marks the Mac Tortie is running on', () => {
    const rows = parseTailscaleStatus(STATUS);
    expect(rows.filter((r) => r.isSelf).map((r) => r.name)).toEqual(['greg-mac']);
  });

  it('drops the trailing dot from a DNS name', () => {
    const rows = parseTailscaleStatus(STATUS);
    expect(rows.find((r) => r.name === 'pop-os')?.host).toBe(
      'pop-os.tail1a2b.ts.net'
    );
  });

  it('falls back to the short name when there is no DNS name', () => {
    const rows = parseTailscaleStatus(STATUS);
    expect(rows.find((r) => r.name === 'no-dns-name')?.host).toBe('no-dns-name');
  });

  it('carries whether each machine is online', () => {
    const rows = parseTailscaleStatus(STATUS);
    expect(rows.find((r) => r.name === 'attic')?.online).toBe(false);
    expect(rows.find((r) => r.name === 'pop-os')?.online).toBe(true);
  });

  it('answers with nothing for text that is not JSON', () => {
    expect(parseTailscaleStatus('not json')).toEqual([]);
  });

  it('answers with nothing for JSON that is not an object', () => {
    expect(parseTailscaleStatus('[1,2,3]')).toEqual([]);
  });

  it('answers with nothing for an empty tailnet', () => {
    expect(parseTailscaleStatus('{}')).toEqual([]);
  });
});

describe('the pinned paths', () => {
  it('put the app bundle first, then the two installer locations', () => {
    expect(TAILSCALE_CANDIDATES).toEqual([
      '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
      '/usr/local/bin/tailscale',
      '/opt/homebrew/bin/tailscale'
    ]);
  });

  it('are all absolute', () => {
    for (const candidate of TAILSCALE_CANDIDATES) {
      expect(candidate.startsWith('/')).toBe(true);
    }
  });
});

describe('the development override', () => {
  let dir = '';
  let fake = '';

  beforeEach(() => {
    resetTailscaleWarningsForTests();
    dir = mkdtempSync(join(tmpdir(), 'tortie-tailscale-'));
    fake = join(dir, 'fake-tailscale');
    writeFileSync(fake, '#!/bin/sh\nexit 0\n', 'utf8');
    chmodSync(fake, 0o755);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('is used in a development build when it names an executable file', () => {
    const out = resolveTailscale({
      packaged: false,
      env: { GMUX_TAILSCALE_BIN: fake }
    });
    expect(out.path).toBe(fake);
    expect(out.source).toBe('dev-override');
  });

  it('is ignored in a packaged build', () => {
    const out = resolveTailscale({
      packaged: true,
      env: { GMUX_TAILSCALE_BIN: fake }
    });
    expect(out.source).not.toBe('dev-override');
    expect(out.path).not.toBe(fake);
  });

  it('is ignored when it is a relative path', () => {
    const out = resolveTailscale({
      packaged: false,
      env: { GMUX_TAILSCALE_BIN: './fake-tailscale' }
    });
    expect(out.source).not.toBe('dev-override');
  });

  it('is ignored when it names a file that is not executable', () => {
    const plain = join(dir, 'not-executable');
    writeFileSync(plain, 'x', 'utf8');
    chmodSync(plain, 0o644);
    const out = resolveTailscale({
      packaged: false,
      env: { GMUX_TAILSCALE_BIN: plain }
    });
    expect(out.source).not.toBe('dev-override');
  });

  it('answers missing when no pinned path has a program and there is no override', () => {
    // This machine may genuinely have Tailscale installed, so the assertion is
    // about the SHAPE of the answer rather than about this machine.
    const out = resolveTailscale({ packaged: false, env: {} });
    expect(['pinned', 'missing']).toContain(out.source);
    if (out.source === 'missing') {
      expect(out.path).toBeNull();
      expect(out.detail).toContain('/Applications/Tailscale.app');
    } else {
      expect(TAILSCALE_CANDIDATES).toContain(out.path);
    }
  });
});
