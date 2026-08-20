/**
 * Phase 95 — a session with no pane of its own on this Mac answers the
 * scroll poll instead of throwing.
 *
 * WHAT WAS WRONG. `scrollTarget` threw `SESSION_NOT_FOUND` whenever `liveIds`
 * held no binding for the row. Two ordinary states hold no binding, being a
 * session that runs on another machine and a session on this Mac that is not
 * running. The renderer polls scroll state once a second for as long as a
 * session is on screen, so each of those sessions produced about 60 rejected
 * calls a minute, and Electron's handler wrapper printed a stack trace for
 * every one of them.
 *
 * WHAT IS UNDER TEST. The four methods that reached that one throw. They get
 * four separate cases on purpose. A fix that missed one of them would still
 * print stack traces.
 *
 * HOW IT IS DRIVEN. The real methods are taken off `GmuxCore.prototype` and
 * called against a small object holding the two things their bodies touch,
 * being `liveIds` and `runScrollCommand`. That is deliberate. Booting a core
 * needs a tmux server, an attach host and a control client, so a functional
 * boot here would prove the mocks rather than the methods.
 *
 * The runner is a spy that records every argv it is given. The strongest
 * claim in this file is that it records ZERO calls when there is no binding,
 * because driving a copy-mode command at a target that does not exist is the
 * second way this could fail.
 */

import { describe, expect, it } from 'vitest';
import { GmuxCore } from '../core';

/** One tab-separated line in the shape `readPaneScroll` asks tmux for. */
function stateLine(over?: {
  inMode?: string;
  position?: string;
  history?: string;
  rows?: string;
  alt?: string;
  mouse?: string;
}): string {
  const f = {
    inMode: '1',
    position: '120',
    history: '5000',
    rows: '42',
    alt: '0',
    mouse: '0',
    ...over
  };
  return [f.inMode, f.position, f.history, f.rows, f.alt, f.mouse].join('\t');
}

interface Harness {
  core: GmuxCore;
  /** Every argv the borrowed body handed the runner, in order. */
  calls: string[][];
}

/**
 * The object the borrowed bodies run against.
 *
 * `answer` is what the fake tmux prints. When it is null the runner throws,
 * which is how a case asserts that no command may be run at all. An
 * unexpected call then fails the test rather than quietly returning a state.
 */
function harness(bindings: [string, string][], answer: string | null): Harness {
  const calls: string[][] = [];
  const core = Object.create(GmuxCore.prototype) as GmuxCore;
  Object.assign(core, {
    liveIds: new Map<string, string>(bindings),
    runScrollCommand: async (args: readonly string[]): Promise<string> => {
      calls.push([...args]);
      if (answer === null) {
        throw new Error(`The test expected no tmux call, and got ${args[0]}.`);
      }
      return answer;
    }
  });
  return { core, calls };
}

/** The four methods, each called the way src/main/ipc.ts calls it. */
const verbs: [string, (core: GmuxCore) => Promise<unknown>][] = [
  ['scrollState', (core) => core.scrollState({ sessionId: 'sess' })],
  ['scrollBy', (core) => core.scrollBy({ sessionId: 'sess', lines: 5 })],
  ['scrollTo', (core) => core.scrollTo({ sessionId: 'sess', position: 10 })],
  ['scrollLive', (core) => core.scrollLive('sess')]
];

describe('no session on this Mac: the four methods answer', () => {
  for (const [name, call] of verbs) {
    it(`${name} says hasPane false and runs no tmux command`, async () => {
      const { core, calls } = harness([], null);
      const state = await call(core);
      expect(state).toEqual({
        hasPane: false,
        position: 0,
        history: 0,
        rows: 0,
        inMode: false,
        innerAlt: false,
        innerMouse: false
      });
      expect(calls).toHaveLength(0);
    });
  }
});

describe('the two states that reach this, one case each', () => {
  it('a session that runs on another machine was never bound here', async () => {
    // Nothing on this Mac ever created it, so the map never held the id.
    const { core, calls } = harness([['other', '$9']], null);
    const state = await core.scrollState({ sessionId: 'sess' });
    expect(state.hasPane).toBe(false);
    expect(state.history).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('a session on this Mac that is not running lost its binding', async () => {
    // This is what releaseSessionResources does when a session ends.
    const { core, calls } = harness([['sess', '$4']], null);
    const live = (core as unknown as { liveIds: Map<string, string> }).liveIds;
    live.delete('sess');
    const state = await core.scrollState({ sessionId: 'sess' });
    expect(state.hasPane).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe('the live path is unchanged', () => {
  it('a bound session runs one command at its $-id', async () => {
    const { core, calls } = harness([['sess', '$4']], stateLine());
    const state = await core.scrollState({ sessionId: 'sess' });
    expect(state).toEqual({
      hasPane: true,
      position: 120,
      history: 5000,
      rows: 42,
      inMode: true,
      innerAlt: false,
      innerMouse: false
    });
    expect(calls).toHaveLength(1);
    const [first] = calls;
    expect(first).toContain('$4');
    expect(first?.[0]).toBe('display-message');
  });

  it('scrollLive on a bound session still cancels copy-mode', async () => {
    const answer = stateLine({ inMode: '0', position: '0' });
    const { core, calls } = harness([['sess', '$4']], answer);
    const state = await core.scrollLive('sess');
    expect(state.hasPane).toBe(true);
    expect(state.position).toBe(0);
    expect(calls[0]).toEqual(['send-keys', '-t', '$4', '-X', 'cancel']);
  });
});

describe('scrollTarget itself', () => {
  it('returns null rather than throwing when there is no binding', () => {
    const { core } = harness([], null);
    const target = (
      core as unknown as { scrollTarget: (id: string) => string | null }
    ).scrollTarget('sess');
    expect(target).toBeNull();
  });

  it('returns the live $-id when there is one', () => {
    const { core } = harness([['sess', '$4']], null);
    const target = (
      core as unknown as { scrollTarget: (id: string) => string | null }
    ).scrollTarget('sess');
    expect(target).toBe('$4');
  });
});
