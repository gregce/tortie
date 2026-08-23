/**
 * Phase 127. The three harness predicates, and why they must stay different.
 *
 * The predicate was typed out twice before this phase, in
 * src/main/tmux/resolve.ts with three terms and in src/main/index.ts with two.
 * Both spellings were correct for what they decide. Merging them would change
 * which launches skip the single-instance lock, and this phase claims nothing
 * changed, so all three live in one module and all three are pinned here.
 *
 * `GMUX_PROBES` is the one term Phase 127 added. `isHarnessLaunch` counts it
 * at any value, so the tmux socket override is honoured. `probesRequested`
 * needs the exact string `1`, so `GMUX_PROBES=0` is a harness launch that
 * loads no probes. That pair is what makes the phase's live probe safe.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  isHarnessLaunch,
  isIsolatedLaunch,
  probesRequested
} from '../launch-gate';

const MAIN = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const resolveTs = readFileSync(join(MAIN, 'tmux', 'resolve.ts'), 'utf8');
const indexTs = readFileSync(join(MAIN, 'index.ts'), 'utf8');

/** An environment with none of the four terms in it. */
const CLEAN: NodeJS.ProcessEnv = { PATH: '/usr/bin', HOME: '/Users/nobody' };

describe('isHarnessLaunch', () => {
  it('answers false for a person launch', () => {
    expect(isHarnessLaunch(CLEAN)).toBe(false);
  });

  it('answers true for each of the four terms on its own', () => {
    for (const name of [
      'GMUX_SMOKE',
      'GMUX_SHOT',
      'GMUX_UPDATE_REHEARSAL',
      'GMUX_PROBES'
    ]) {
      expect(
        isHarnessLaunch({ ...CLEAN, [name]: '1' }),
        `${name} must arm the harness predicate`
      ).toBe(true);
    }
  });

  it('treats an empty string as not set', () => {
    // A variable exported empty in a shell profile is not a harness launch.
    // This is the shape the old inline tests used and it must not change,
    // because `GMUX_TMUX_SOCKET` is honoured on the strength of this answer.
    for (const name of [
      'GMUX_SMOKE',
      'GMUX_SHOT',
      'GMUX_UPDATE_REHEARSAL',
      'GMUX_PROBES'
    ]) {
      expect(isHarnessLaunch({ ...CLEAN, [name]: '' })).toBe(false);
    }
  });

  it('answers true for GMUX_PROBES=0, which is what the Phase 127 probe needs', () => {
    // The unarmed leg of build/probe-p127-probes.mjs sets GMUX_PROBES=0. It
    // must still be a harness launch, so GMUX_TMUX_SOCKET is honoured and the
    // leg cannot reach the operator's own tmux server.
    expect(isHarnessLaunch({ ...CLEAN, GMUX_PROBES: '0' })).toBe(true);
  });
});

describe('probesRequested', () => {
  it('answers false for a person launch', () => {
    expect(probesRequested(CLEAN)).toBe(false);
  });

  it('answers true for the three older terms, so no harness changes', () => {
    for (const name of ['GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_UPDATE_REHEARSAL']) {
      expect(probesRequested({ ...CLEAN, [name]: '1' })).toBe(true);
    }
  });

  it('needs GMUX_PROBES to be exactly the string 1', () => {
    expect(probesRequested({ ...CLEAN, GMUX_PROBES: '1' })).toBe(true);
    for (const value of ['0', '', 'yes', 'true', '11']) {
      expect(
        probesRequested({ ...CLEAN, GMUX_PROBES: value }),
        `GMUX_PROBES=${value} must not load the probes`
      ).toBe(false);
    }
  });

  it('differs from isHarnessLaunch on exactly one value, and that is the point', () => {
    // GMUX_PROBES=0 keeps the scratch socket AND keeps the probes out. That
    // pair is what lets the Phase 127 probe run its unarmed leg safely.
    const env = { ...CLEAN, GMUX_PROBES: '0' };
    expect(isHarnessLaunch(env)).toBe(true);
    expect(probesRequested(env)).toBe(false);
  });
});

describe('isIsolatedLaunch', () => {
  it('answers false for a person launch', () => {
    expect(isIsolatedLaunch(CLEAN)).toBe(false);
  });

  it('is TWO terms and must stay two', () => {
    expect(isIsolatedLaunch({ ...CLEAN, GMUX_SMOKE: 'basic' })).toBe(true);
    expect(isIsolatedLaunch({ ...CLEAN, GMUX_SHOT: '/tmp/x.png' })).toBe(true);
    // The update rehearsal MUST still take the single-instance lock. The lock
    // lives in the isolated profile the rehearsal always passes, so it
    // protects the rehearsal without touching the operator's instance.
    expect(isIsolatedLaunch({ ...CLEAN, GMUX_UPDATE_REHEARSAL: '1' })).toBe(
      false
    );
    // A probe launch is not on its own a reason to skip the lock either.
    expect(isIsolatedLaunch({ ...CLEAN, GMUX_PROBES: '1' })).toBe(false);
  });
});

describe('the two call sites read the gate rather than retyping it', () => {
  it('resolve.ts and index.ts both import it', () => {
    expect(resolveTs).toContain(
      "import { isHarnessLaunch } from '../harness/launch-gate';"
    );
    expect(resolveTs).toContain('const harnessLaunch = isHarnessLaunch(env);');
    expect(indexTs).toContain(
      "import { isIsolatedLaunch, probesRequested } from './harness/launch-gate';"
    );
    expect(indexTs).toContain(
      'const harnessLaunch = isIsolatedLaunch(process.env);'
    );
  });

  it('neither file spells the terms out again', () => {
    for (const text of [resolveTs, indexTs]) {
      expect(text.includes("(env['GMUX_SMOKE'] ?? '') !== ''")).toBe(false);
      expect(text.includes("(process.env['GMUX_SMOKE'] ?? '') !== ''")).toBe(
        false
      );
    }
  });

  it('main appends harness=1 to the renderer URL and nothing else', () => {
    expect(indexTs).toContain(
      "const search = probesRequested(process.env) ? 'harness=1' : '';"
    );
    expect(indexTs).toContain('{ search }');
  });
});
