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
 *
 * A third property, added in Phase 79. The source the picker sends to the screen
 * is the one the resolver decided. Nothing on the way out rewrites it, because a
 * rewritten source is how a screen comes to claim a pinned path Tortie did not
 * run.
 */

import {
  accessSync,
  chmodSync,
  constants,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TAILSCALE_CANDIDATES,
  TAILSCALE_MISSING_NOTE,
  parseTailscaleStatus,
  readTailnetMachines,
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

// ---------------------------------------------------------------------------
// The one call, and the source it sends to the screen
// ---------------------------------------------------------------------------

/** This module's own text, read the way the machines tests already read one. */
const tailscaleSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'tailscale.ts'),
  'utf8'
);

/** True when one of the three pinned paths holds a program on this machine. */
function pinnedProgramExists(): boolean {
  return TAILSCALE_CANDIDATES.some((candidate) => {
    try {
      if (!statSync(candidate).isFile()) return false;
      accessSync(candidate, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

describe('the one call', () => {
  let dir = '';
  let standIn = '';

  beforeEach(() => {
    resetTailscaleWarningsForTests();
    dir = mkdtempSync(join(tmpdir(), 'tortie-tailscale-call-'));
    standIn = join(dir, 'stand-in-tailscale');
    // A stand-in that prints one fixed document. Nothing here asks the person's
    // own network, and no pinned program is run.
    writeFileSync(standIn, `#!/bin/sh\ncat <<'JSON'\n${STATUS}\nJSON\n`, 'utf8');
    chmodSync(standIn, 0o755);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('sends the screen the source the resolver decided', async () => {
    const out = await readTailnetMachines({
      packaged: false,
      env: { GMUX_TAILSCALE_BIN: standIn },
      alreadyAdded: []
    });
    expect(out.source).toBe('dev-override');
    expect(out.binary).toBe(standIn);
  });

  it('sends the machines the program listed, in the parse order', async () => {
    const out = await readTailnetMachines({
      packaged: false,
      env: { GMUX_TAILSCALE_BIN: standIn },
      alreadyAdded: []
    });
    expect(out.peers.map((peer) => peer.name)).toEqual([
      'greg-mac',
      'attic',
      'no-dns-name',
      'pop-os'
    ]);
    expect(out.peers.filter((peer) => peer.isThisMac).map((peer) => peer.name)).toEqual([
      'greg-mac'
    ]);
    expect(out.note).toBeNull();
  });

  it('marks a machine that machines.json already holds', async () => {
    const out = await readTailnetMachines({
      packaged: false,
      env: { GMUX_TAILSCALE_BIN: standIn },
      alreadyAdded: ['ATTIC.tail1a2b.ts.net']
    });
    expect(out.peers.filter((peer) => peer.alreadyAdded).map((peer) => peer.name)).toEqual([
      'attic'
    ]);
  });
});

describe('the source the screen prints', () => {
  it('is passed straight through, and no line rewrites it', () => {
    // This one reads the module's own text rather than driving the code, and
    // here is the reason. The line it guards sat on the second return of
    // readTailnetMachines. That return is only reached when a path resolved, and
    // a path resolves exactly when the source is not 'missing', so no input can
    // drive the branch. A behavioural test would look like proof and be none.
    // Reading the text is the shape build/conformance-machines.mjs already uses
    // on the production files in this directory.
    expect(tailscaleSource).toContain('source: resolution.source,');
    expect(tailscaleSource).not.toMatch(/'missing'\s*\?\s*'pinned'/);
  });
});

describe('when no pinned path holds a program', () => {
  it('says so in the early return, which is the arm that answers', () => {
    // Always runs, on any machine. The arm is read out of the module's text
    // because a machine that has Tailscale cannot be driven into it.
    const arm = tailscaleSource.slice(
      tailscaleSource.indexOf('if (resolution.path === null)'),
      tailscaleSource.indexOf('const added =')
    );
    expect(arm).toContain('binary: null');
    expect(arm).toContain("source: 'missing'");
    expect(arm).toContain('TAILSCALE_MISSING_NOTE');
  });

  it('answers with no binary, the source missing and no machines', async () => {
    // Which half of this runs depends on the machine, and the test says which
    // rather than pretending. On a machine with no Tailscale the call itself is
    // driven and the early return is proven end to end. On a machine that has
    // Tailscale there is no way into that arm without editing main, and main is
    // fenced in this phase, so only the resolver half is proven here. The call
    // is deliberately not made in that case, because with no override it would
    // run the real program and ask the person's own network.
    if (pinnedProgramExists()) {
      const resolution = resolveTailscale({ packaged: false, env: {} });
      expect(resolution.source).toBe('pinned');
      expect(TAILSCALE_CANDIDATES).toContain(resolution.path);
      return;
    }
    const out = await readTailnetMachines({
      packaged: false,
      env: {},
      alreadyAdded: []
    });
    expect(out.binary).toBeNull();
    expect(out.source).toBe('missing');
    expect(out.peers).toEqual([]);
    expect(out.note).toBe(TAILSCALE_MISSING_NOTE);
  });
});
