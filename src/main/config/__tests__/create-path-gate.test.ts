/**
 * The confirm gate is ASKED on the path that creates a session.
 *
 * This is the one thing neither of the checks either side of it can prove.
 * `build/assert-bundle-refusals.mjs` proves the refusal sentences survived the
 * bundler and reached `out/main/index.js`. `npm run smoke:config` proves the
 * gate answers correctly against the real macOS keychain. Between them sits the
 * question that actually decides whether any of it matters, which is whether
 * anything calls the gate before it spawns a process.
 *
 * Builder 2 named this gap in their own report and could not close it, because
 * the call site did not exist yet. It exists now, in `launchEntryFor` in
 * src/main/manifest/agents.ts, and this file is the proof.
 *
 * ## What is proved here, and what is not
 *
 * Electron's `safeStorage` is mocked as unavailable, exactly as the other tests
 * in this directory mock it. That means nothing can be confirmed in this
 * process, so every configured row that supplies something executable refuses.
 * That is the SAFE direction and it is the direction worth testing here: a
 * build that has lost the gate would launch, and this fails when it does.
 *
 * The other direction, being a confirmed row that goes on to launch, needs a
 * real keychain in a real Electron process. That is `npm run smoke:config`,
 * which prints "confirmed, sealed by the real keychain, and it may launch".
 * Neither check replaces the other.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData },
  safeStorage: {
    // Unavailable, so nothing in this process can be confirmed and every
    // configured row that carries something executable must refuse.
    isEncryptionAvailable: () => false,
    encryptString: () => Buffer.from(''),
    decryptString: () => ''
  }
}));

const { loadAgentOverlay, resetAgentOverlayStoreForTests, agentOverlayDiskReads } =
  await import('../store');
const { agentOverlayPath, ensureConfigDir } = await import('../paths');
const { buildLaunchSpec, buildRecoveryContract } = await import('../../manifest/agents');

function writeOverlay(agents: unknown[]): void {
  ensureConfigDir();
  writeFileSync(
    agentOverlayPath(),
    JSON.stringify({ schema: 1, agents }, null, 2),
    'utf8'
  );
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'tortie-gate-'));
  resetAgentOverlayStoreForTests();
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

describe('a configured agent cannot launch without a confirmation', () => {
  it('refuses a brand new agent nobody has agreed to, and names it', () => {
    writeOverlay([
      {
        id: 'owl',
        displayName: 'Owl',
        binaries: ['owl'],
        launch: { argv: ['owl', '--yolo'] }
      }
    ]);
    loadAgentOverlay('boot');

    // The cast is the pre-existing gap recorded on `AgentKind` in
    // src/shared/types.ts: the create path's parameter type has not carried
    // registry agents beyond claude and codex since Phase 10, while the runtime
    // has. A configured id arrives the same way every other one does.
    expect(() => buildLaunchSpec('owl' as never, [], '/abs/owl')).toThrow(/owl/);
  });

  it('the refusal is the gate speaking, not a missing agent', () => {
    writeOverlay([
      {
        id: 'owl',
        displayName: 'Owl',
        binaries: ['owl'],
        launch: { argv: ['owl'] }
      }
    ]);
    loadAgentOverlay('boot');
    let message = '';
    try {
      buildLaunchSpec('owl' as never, [], '/abs/owl');
    } catch (err) {
      message = (err as Error).message;
    }
    // A person has to be able to tell "Tortie will not run this until you say
    // so" apart from "Tortie has never heard of this". The two sentences are
    // different and this is the one that means the former.
    expect(message).toMatch(/confirm|agreed|approve/i);
    expect(message).not.toMatch(/Unknown agent registry id/);
  });

  it('refuses a row that rewrites a compiled agent into something else', () => {
    // The dangerous case, and the reason the gate is bound to a hash rather
    // than to an id. `claude` is an agent this build ships and the user already
    // trusts. A row that repoints it at another program must not inherit that
    // trust.
    writeOverlay([
      {
        id: 'claude',
        launch: { argv: ['claude', '--dangerously-skip-permissions'] }
      }
    ]);
    loadAgentOverlay('boot');
    expect(() => buildLaunchSpec('claude', [], '/abs/claude')).toThrow(
      /confirm|agreed|approve/i
    );
  });

  it('the recovery contract is refused too, so nothing is written either', () => {
    // buildRecoveryContract resolves the same entry. If it did not, a refused
    // agent could still leave a manifest row describing how to resume it.
    writeOverlay([
      {
        id: 'owl',
        displayName: 'Owl',
        binaries: ['owl'],
        launch: { argv: ['owl'] }
      }
    ]);
    loadAgentOverlay('boot');
    expect(() =>
      buildRecoveryContract('owl' as never, {
        at: 1,
        bin: '/abs/owl',
        cwdReal: '/tmp',
        projectReal: '/tmp',
        agentVersion: null
      })
    ).toThrow(/confirm|agreed|approve/i);
  });
});

describe('the gate does not get in the way of what it should not', () => {
  it('a row that only renames a compiled agent still launches', () => {
    // A nickname supplies nothing that can run, so `executionHash` is null and
    // there is nothing for a person to have agreed to. If this ever throws, the
    // gate has become the thing research 31 warned it must not be, which is a
    // tax on configuration rather than a check on execution.
    writeOverlay([{ id: 'claude', displayName: 'My Claude' }]);
    loadAgentOverlay('boot');
    const spec = buildLaunchSpec('claude', ['--model', 'opus'], '/abs/claude');
    // claude pre-assigns, so the id it was given sits between the binary and
    // the user's extras. The point of the assertion is that this is the
    // compiled claude argv, unchanged by a row that only renamed it.
    expect(spec.argv).toEqual([
      '/abs/claude',
      '--session-id',
      spec.agentSessionId,
      '--model',
      'opus'
    ]);
    expect(spec.idCapture).toBe('preassigned');
  });

  it('every compiled agent launches unchanged when there is no file at all', () => {
    loadAgentOverlay('boot');
    const spec = buildLaunchSpec('claude', [], '/abs/claude');
    expect(spec.argv[0]).toBe('/abs/claude');
    expect(spec.idCapture).toBe('preassigned');
    expect(spec.resumeArgv?.[0]).toBe('/abs/claude');
  });

  it('a shell is never gated and never touches the table', () => {
    loadAgentOverlay('boot');
    const before = agentOverlayDiskReads();
    const spec = buildLaunchSpec('shell', [], '/bin/zsh');
    expect(spec.argv).toEqual(['/bin/zsh']);
    expect(agentOverlayDiskReads()).toBe(before);
  });
});
