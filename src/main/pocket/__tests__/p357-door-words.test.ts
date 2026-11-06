/**
 * Phase 357 — the phone's door while the Mac's session list has stopped
 * reading correctly (build/p357/SPEC.md D22, §0.1 item 7).
 *
 * At the parent a throwing session list reached `bind.ts`'s catch and was
 * answered with the door's one refusal, a 404, and a 404 on the LIST sends the
 * phone to Pairing with "not paired". The phone cannot change in this phase,
 * so the words travel where it already draws words: the Needs input answer's
 * `emptyLine`. Every other read answers as an unknown id, which the phone routes
 * back to that list (`backToList`, and `.olderMac` for the Sessions tab). The
 * writes are unchanged: each verb reaches the store, which refuses before tmux.
 *
 * What is held here:
 *
 *   1. `blocked()` answers no rows and the phone line, reading NO other fact;
 *   2. `sessions`, `session`, `turns`, `screen` and `scrollback` answer null,
 *      each before any other read, and with the latch clear each one reads on
 *      exactly as before (the control that proves the branch is what stopped
 *      it);
 *   3. only an exact `true` stops a read, and a facts object without the
 *      member is a door that is not stopped;
 *   4. `createPocketFacts` reads the latch through the core and nothing else,
 *      and the production core's `manifestStopped` is a read of the REAL
 *      store's latch;
 *   5. the write path is handed no facts and names no latch.
 *
 * Nothing here opens a socket, touches Electron or reads a person's data.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project, Session } from '@shared/types';
import { POCKET_AGE_HONESTY } from '@shared/ipc/pocket';
import { MANIFEST_STOPPED_PHONE_LINE } from '@shared/manifest-stopped-copy';
import { createPocketRoutes, type PocketFacts } from '../routes';
import { createPocketFacts, type PocketFactsCore } from '../facts';
import type { GmuxCore } from '../../sessions/core';

vi.mock('../../typed-events', () => ({
  broadcastEvent: (): void => undefined,
  sendEvent: (): void => undefined
}));

// Imported once, here, because importing the session core takes its whole
// graph; inside a test that cost counts against the test's own budget.
const { GmuxCore: Core } = await import('../../sessions/core');
const { ManifestStore, STOPPED_FINGERPRINT, setManifestFaultHook } = await import(
  '../../manifest/store'
);

/**
 * THE PRODUCTION CORE CARRIES THE READ. The member is optional on
 * `PocketFactsCore` only because the tests' own cores predate it; this fails
 * to compile the moment `GmuxCore` stops declaring it.
 */
type CoreReadsTheLatch = GmuxCore extends Required<Pick<PocketFactsCore, 'manifestStopped'>>
  ? true
  : never;
export const coreReadsTheLatch: CoreReadsTheLatch = true;

const NOW = 1_800_000_000_000;

function session(over: Partial<Session> & Pick<Session, 'id'>): Session {
  return {
    name: over.id,
    tmuxName: over.id,
    projectPath: '/Users/x/work/alpha',
    cwd: '/Users/x/work/alpha',
    agent: 'claude',
    status: 'needs_input',
    createdAt: 1_000,
    ...over
  } as Session;
}

const SESSIONS: Session[] = [
  session({ id: 'a' }),
  session({ id: 'b', status: 'running', createdAt: 2_000 })
];
const PROJECTS: Project[] = [{ id: 'p1', path: '/Users/x/work/alpha', name: 'alpha' }];

/**
 * Facts in which EVERY read but the latch and the clock is counted, so an
 * answer that reads anything before its stop branch says so by name.
 */
function counted(stopped: () => boolean | undefined): {
  facts: PocketFacts;
  reads: string[];
} {
  const reads: string[] = [];
  const note = (name: string): void => {
    reads.push(name);
  };
  const facts: PocketFacts = {
    sessions: () => {
      note('sessions');
      return SESSIONS;
    },
    projects: () => {
      note('projects');
      return PROJECTS;
    },
    blockedSince: () => {
      note('blockedSince');
      return new Map([['a', 1_500]]);
    },
    wakes: () => {
      note('wakes');
      return [];
    },
    activity: () => {
      note('activity');
      return undefined;
    },
    statusWord: (s) => {
      note('statusWord');
      return s.status === 'needs_input'
        ? { dot: 'attention', label: 'needs input' }
        : { dot: 'working', label: 'working' };
    },
    agentLabel: (id) => {
      note('agentLabel');
      return id;
    },
    machineLabel: () => {
      note('machineLabel');
      return null;
    },
    emptyLine: 'Nothing needs you',
    catchUp: async () => {
      note('catchUp');
      return null;
    },
    lastTurn: async () => {
      note('lastTurn');
      return { answerText: null, turnCount: 0 };
    },
    turns: async () => {
      note('turns');
      return { turns: [], more: false };
    },
    handoff: () => {
      note('handoff');
      return null;
    },
    screen: async () => {
      note('screen');
      throw new Error('the reader was asked');
    },
    scrollback: async () => {
      note('scrollback');
      throw new Error('the reader was asked');
    },
    now: () => NOW
  };
  const answer = stopped();
  if (answer !== undefined) facts.listStopped = () => answer;
  return { facts, reads };
}

const SCREEN_QUERY = new URLSearchParams('id=a');
const SCROLLBACK_QUERY = new URLSearchParams('id=a&from=100&count=3&depth=3000&wrap=8&keep=bottom');
const never = (): boolean => false;

describe('the Needs input list says the sentence (D22)', () => {
  it('answers no rows and the phone line, and reads no other fact', () => {
    const { facts, reads } = counted(() => true);
    expect(createPocketRoutes(facts).blocked()).toEqual({
      rows: [],
      others: [],
      othersOmitted: 0,
      at: NOW,
      emptyLine: MANIFEST_STOPPED_PHONE_LINE,
      ageNote: POCKET_AGE_HONESTY
    });
    expect(reads).toEqual([]);
  });

  it('with the latch clear it is the list it always was', () => {
    const { facts, reads } = counted(() => false);
    const answer = createPocketRoutes(facts).blocked();
    expect(answer.rows.map((r) => r.sessionId)).toEqual(['a']);
    expect(answer.others.map((r) => r.sessionId)).toEqual(['b']);
    expect(answer.emptyLine).toBe('Nothing needs you');
    expect(reads).toContain('sessions');
  });

  it('the phone line names no tmux word and no file verdict', () => {
    expect(MANIFEST_STOPPED_PHONE_LINE).not.toMatch(/\b(pane|window|prefix|tmux|file|SQLite|database)\b/i);
  });
});

describe('every other read answers as an unknown id, before any read (D22)', () => {
  it('sessions, session, turns, screen and scrollback answer null and read nothing', async () => {
    const { facts, reads } = counted(() => true);
    const routes = createPocketRoutes(facts);
    expect(routes.sessions(new URLSearchParams())).toBeNull();
    expect(await routes.session('a')).toBeNull();
    expect(await routes.turns('a', {})).toBeNull();
    expect(await routes.screen(SCREEN_QUERY, never)).toBeNull();
    expect(await routes.scrollback(SCROLLBACK_QUERY, never)).toBeNull();
    expect(reads).toEqual([]);
  });

  it('with the latch clear each one reads on as it did (the control)', async () => {
    const { facts, reads } = counted(() => false);
    const routes = createPocketRoutes(facts);
    expect(routes.sessions(new URLSearchParams())?.rows.map((r) => r.sessionId).sort()).toEqual([
      'a',
      'b'
    ]);
    expect((await routes.session('a'))?.session.sessionId).toBe('a');
    expect((await routes.turns('a', {}))?.sessionId).toBe('a');
    // Each reader is asked, which is what the stop branch refused to do.
    expect(await routes.screen(SCREEN_QUERY, never)).toBeNull();
    expect(await routes.scrollback(SCROLLBACK_QUERY, never)).toBeNull();
    expect(reads).toContain('screen');
    expect(reads).toContain('scrollback');
    expect(reads).toContain('catchUp');
    expect(reads).toContain('turns');
  });

  it('a door with no latch member is a door that is not stopped', async () => {
    const { facts, reads } = counted(() => undefined);
    expect(facts.listStopped).toBeUndefined();
    const routes = createPocketRoutes(facts);
    expect(routes.blocked().rows).toHaveLength(1);
    expect((await routes.session('a'))?.session.sessionId).toBe('a');
    expect(reads).toContain('sessions');
  });
});

describe('the facts read the latch through the core (D22)', () => {
  const overview = { manifest: () => Promise.reject(new Error('unused')), store: () => null as never };

  it('answers the core’s own read, and false with no core or no member', () => {
    let stopped = false;
    const core: PocketFactsCore = {
      listSessions: () => SESSIONS,
      listProjects: () => PROJECTS,
      activityOf: () => undefined,
      onSessionsBroadcast: null,
      manifestStopped: () => stopped
    };
    const facts = createPocketFacts({ core: () => core, overview, wakes: () => [] });
    expect(facts.listStopped?.()).toBe(false);
    stopped = true;
    expect(facts.listStopped?.()).toBe(true);
    expect(createPocketRoutes(facts).blocked().emptyLine).toBe(MANIFEST_STOPPED_PHONE_LINE);

    const early = createPocketFacts({ core: () => null, overview, wakes: () => [] });
    expect(early.listStopped?.()).toBe(false);

    const older: PocketFactsCore = {
      listSessions: () => SESSIONS,
      listProjects: () => PROJECTS,
      activityOf: () => undefined,
      onSessionsBroadcast: null
    };
    const olderFacts = createPocketFacts({ core: () => older, overview, wakes: () => [] });
    expect(olderFacts.listStopped?.()).toBe(false);
  });

  describe('over the REAL store and the production core’s read', () => {
    let dir = '';
    afterEach(() => {
      setManifestFaultHook(null);
      if (dir !== '') rmSync(dir, { recursive: true, force: true });
      dir = '';
      vi.restoreAllMocks();
    });

    it('says the sentence once the store has latched, whichever member latched it', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      dir = mkdtempSync(join(tmpdir(), 'tortie-p357-door-'));
      const store = new ManifestStore(join(dir, 'manifest.db'));
      const proto = Core.prototype as unknown as {
        manifestStopped(this: unknown): boolean;
        listSessions(this: unknown): Session[];
      };
      const host = { manifest: store };
      const core: PocketFactsCore = {
        listSessions: () => proto.listSessions.call(host),
        listProjects: () => PROJECTS,
        activityOf: () => undefined,
        onSessionsBroadcast: null,
        manifestStopped: () => proto.manifestStopped.call(host)
      };
      const routes = createPocketRoutes(
        createPocketFacts({ core: () => core, overview, wakes: () => [], now: () => NOW })
      );
      expect(routes.blocked().emptyLine).toBe('Nothing needs you');
      // The ring's fingerprint is one of the three members that answer rather
      // than refuse; it latches all the same, and the door must hear it.
      setManifestFaultHook((op) => {
        if (op === 'contentFingerprint') {
          throw new Database.SqliteError('database disk image is malformed', 'SQLITE_CORRUPT');
        }
      });
      // Never null once stopped (the fix round): null is the backup ring's
      // "take one", and this store never answered a fingerprint before.
      expect(store.contentFingerprint()).toBe(STOPPED_FINGERPRINT);
      setManifestFaultHook(null);
      expect(routes.blocked()).toMatchObject({ rows: [], others: [], emptyLine: MANIFEST_STOPPED_PHONE_LINE });
      expect(routes.sessions(new URLSearchParams())).toBeNull();
      expect(await routes.session('a')).toBeNull();
      store.close();
    });
  });
});

describe('the writes are unchanged (D22)', () => {
  it('the write path is handed no facts and names no latch', () => {
    const writes = readFileSync(join(__dirname, '..', 'writes.ts'), 'utf8');
    expect(writes).not.toMatch(/listStopped|manifestStopped/);
    const deps = /export interface PocketWriteDeps \{([\s\S]*?)\n\}/.exec(writes)?.[1] ?? '';
    expect(deps).not.toBe('');
    expect(deps).not.toMatch(/\bfacts\b|PocketFacts/);
  });
});
