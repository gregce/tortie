/**
 * Phase 15 — does the capture switch reach main AT ALL?
 *
 * THE BUG THIS EXISTS TO PREVENT, found at integration and not by any of the
 * suites either builder wrote. The create sheet sent its answer as a spread:
 *
 *     void createSession({ name, agent, ...(capture ? { capture: true } : {}) })
 *
 * and the store's `createSession` destructured `{ name, agent, cwd, extraArgs }`
 * — no `capture`, so it never reached `sessions.create`. TypeScript did not
 * catch it: a property arriving through a SPREAD is exempt from the
 * excess-property check that would have rejected it written inline. Both sides
 * were individually correct, both sides had passing tests, main's whole
 * wrap/record/sync stack worked, and the user's switch did nothing.
 *
 * So these tests assert the WIRE, not the reasoning: what argument object does
 * `window.gmux.sessions.create` actually receive?
 *
 *  1. capture on  → `capture: true` on the wire.
 *  2. capture off → the key is ABSENT, not `false` — that is the shape every
 *     pre-Phase-15 build sent, and main reads exactly `=== true`.
 *  3. quick-create (no modal) inherits the sticky per-agent default, which is
 *     the ˅ board and the per-agent hotkeys; the sheet's own answer is sent
 *     by the sheet.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

interface CreateArgs {
  name: string;
  projectPath: string;
  agent: string;
  capture?: boolean;
  extraArgs?: string[];
}

const created: CreateArgs[] = [];

/** Stands in for the preload bridge; records what the store sends it. */
function installGlobals(): void {
  vi.stubGlobal('window', {
    addEventListener() {},
    removeEventListener() {},
    gmux: {
      sessions: {
        create: (input: CreateArgs) => {
          created.push(input);
          return Promise.resolve({ id: `sess-${created.length}`, ...input });
        }
      }
    }
  });
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem() {},
    removeItem() {}
  });
  vi.stubGlobal('document', {
    body: { classList: { add() {}, remove() {}, contains: () => false } }
  });
}

installGlobals();

const { useApp } = await import('../store');
const { useSettingsStore } = await import('../../settings/settings-store');

const PROJECT = {
  id: 'proj-1',
  name: 'gmux',
  path: '/tmp/gmux-capture-wiring',
  addedAt: 0
};

beforeEach(() => {
  created.length = 0;
  useApp.setState({
    projects: [PROJECT],
    activeProjectId: PROJECT.id,
    sessions: []
  } as never);
  useSettingsStore.setState((s) => ({
    settings: { ...s.settings, captureDefaults: {} }
  }));
});

describe('the capture switch reaches main', () => {
  it('sends capture: true when the sheet asked for it', async () => {
    await useApp.getState().createSession({
      name: 'claude-1',
      agent: 'claude',
      capture: true
    });
    expect(created).toHaveLength(1);
    expect(created[0]?.capture).toBe(true);
  });

  it('omits the key entirely when capture is off', async () => {
    await useApp.getState().createSession({ name: 'claude-1', agent: 'claude' });
    expect(created).toHaveLength(1);
    // Absent, not false: this is byte-for-byte the payload every session
    // before Phase 15 was created with.
    expect(created[0] && 'capture' in created[0]).toBe(false);
  });

  it('quick-create inherits the sticky per-agent default', async () => {
    useSettingsStore.setState((s) => ({
      settings: { ...s.settings, captureDefaults: { claude: true } }
    }));
    await useApp.getState().quickCreate('claude');
    expect(created).toHaveLength(1);
    expect(created[0]?.capture).toBe(true);
  });

  it('quick-create of an agent with no stored default stays uncaptured', async () => {
    useSettingsStore.setState((s) => ({
      settings: { ...s.settings, captureDefaults: { claude: true } }
    }));
    await useApp.getState().quickCreate('codex');
    expect(created).toHaveLength(1);
    expect(created[0] && 'capture' in created[0]).toBe(false);
  });
});
