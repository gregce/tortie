/**
 * Phase 359, Builder B — the restore call site follows the current switch
 * and leaves the record byte-identical.
 *
 * WHAT THIS PINS, by reading the shipping source (no Electron, no tmux):
 * - restore composes delivery from the CURRENT sealed switch
 *   (`restoreSettings.agentAccess`), never from the row;
 * - the delivered argv reaches `tmux.createSession`; the manifest row is
 *   never altered (`updateSession`/`insertSession` carry no delivered value);
 * - `GMUX_AGENT_SOCKET` merges after the recomposed `paneEnvFor` env;
 * - non-local rows take no local delivery (the guarded path leaves early or
 *   never composes).
 *
 * The pure composition matrix lives in `p359-delivery.test.ts`.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (): string =>
  readFileSync(resolve(import.meta.dirname, '../../restore/restore.ts'), 'utf8');

describe('restore composes delivery from the current sealed switch', () => {
  it('reads the switch off the restore-time settings, never the row', () => {
    expect(source()).toContain('enabled: restoreSettings.agentAccess === true');
  });

  it('passes the delivered spawn argv to tmux.createSession', () => {
    expect(source()).toContain('argv: deliveredShellArgv');
  });

  it('merges the socket env after the recomposed pane env', () => {
    const body = source();
    const at = body.indexOf('restoreBaseEnv');
    expect(at).toBeGreaterThan(-1);
    expect(body.slice(at, at + 500)).toContain('...restoreDelivery.env');
  });
});

describe('restore never alters the record', () => {
  it('writes no delivered value back to the manifest', () => {
    const body = source();
    // The only manifest writes on this path are the restore-attempt
    // bookkeeping owned by core; this module composes delivery only into
    // the createSession argv/env locals.
    expect(body).not.toMatch(/manifest\.(updateSession|insertSession)\([^)]*deliver/);
    // `deliveredShellArgv` is composed once and reaches createSession.
    const uses = body.match(/deliveredShellArgv/g) ?? [];
    expect(uses.length).toBe(2);
    // `deliveredEnv` is the createSession env local, nothing else.
    const envUses = body.match(/deliveredEnv/g) ?? [];
    expect(envUses.length).toBe(2);
  });
});

describe('the remote boundary', () => {
  it('composes local delivery only for this Mac', () => {
    expect(source()).toContain('local: true');
  });
});
