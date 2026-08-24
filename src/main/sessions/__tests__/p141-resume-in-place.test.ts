/**
 * Phase 141 — the verb only appears where an agent really left, and the press
 * refuses everything else.
 *
 * ## The case that outranks every other assertion in this file
 *
 * A session Tortie has just restored, sitting with its command armed and
 * unpressed, is byte for byte the same shape as one whose agent has left. Its
 * own program is the login shell, its screen shows a prompt, and nothing is
 * running under it. Three candidate designs died on that fact, because each of
 * them read the shape.
 *
 * The first suite below is that case, and its assertion is that NOTHING is
 * published and NOTHING is typed. The service is never told about the session
 * at all, which is exactly what a restore does: the poll records a witness only
 * for a process it watched being an agent, and a restored session has had no
 * agent in it. There is no code path in this module that can invent one, and
 * this suite is what holds that shut.
 *
 * ## What is real here
 *
 * The composition and the read back are REAL. `composeArmedResumeText`,
 * `buildArmedCommand`, `countOccurrences` and `decideArmLanding` are the
 * shipped functions from `../../machines/remote-arm.ts` and
 * `../../restore/command.ts`, so the text asserted below is the text a person
 * would see, quoting and all. What is replaced is the world: one function
 * answers the tmux reads, one records what was typed, and one answers the
 * three process reads. Nothing spawns, nothing types anywhere and no tmux
 * server is contacted.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock(import('../../tmux'), async (importOriginal) => ({
  ...(await importOriginal()),
  setSessionOption: () => Promise.resolve(),
  execTmux: () => Promise.resolve('')
}));

const {
  ResumeInPlaceService,
  claudeConversationFor,
  conversationIdFromCommand
} = await import('../resume-in-place');
const { forgetConversationClaims } = await import('../../manifest/harvest');

import type { ManifestStore, ManifestSessionRecord } from '../../manifest';
import type { IdHarvestDeps } from '../id-harvest';
import type {
  ProcessReader,
  SessionHandbackUpdate
} from '../resume-in-place';
import { p141Row } from './p141-row';

const CONVERSATION = '7f891378-5855-4776-ae75-57efeeb67bb6';
const TARGET = '$7';
const SHELL_PID = 4321;
/** The process that appears in the session after the agent left. */
const RETURNED_PID = 9000;

/** What the fake world is set to before a call, and what it recorded after. */
interface World {
  service: InstanceType<typeof ResumeInPlaceService>;
  published: SessionHandbackUpdate[];
  typed: string[];
  screen: { text: string };
  pane: { paneId: string; pid: number; dead: boolean; command: string };
  /** The clock the service reads, so a test can move time forward. */
  clock: { at: number };
  /** Every handback this service closed, and how it closed. */
  resolved: { sessionId: string; outcome: string }[];
  processes: Map<number, { stat: string; ppid: number; command: string }>;
  children: Map<number, number[]>;
  /** Every conversation id this run wrote to the manifest row. */
  writes: string[];
}

function rowOf(over: Partial<ManifestSessionRecord> = {}): ManifestSessionRecord {
  // The shared row plus the two fields this file's rules read, being a row
  // that already holds a conversation and can already arm it.
  return p141Row({
    agentSessionId: CONVERSATION,
    resumeArgv: ['/usr/local/bin/claude', '--resume', CONVERSATION],
    ...over
  });
}

function makeWorld(rec: ManifestSessionRecord = rowOf(), echoes = 1): World {
  const published: SessionHandbackUpdate[] = [];
  const typed: string[] = [];
  const screen = { text: 'Gregs-MacBook-Pro-2% ' };
  const pane = { paneId: '%12', pid: SHELL_PID, dead: false, command: 'zsh' };
  const processes = new Map<number, { stat: string; ppid: number; command: string }>(
    // The session's own process, holding the terminal with nothing under it.
    [[SHELL_PID, { stat: 'Ss+', ppid: 1, command: '-zsh' }]]
  );
  const children = new Map<number, number[]>();
  const clock = { at: 1_000 };
  const resolved: { sessionId: string; outcome: string }[] = [];

  const writes: string[] = [];
  const manifest = {
    getSession: (id: string) => (id === rec.id ? rec : undefined),
    setAgentSessionId: (_id: string, conversation: string) => {
      writes.push(conversation);
      return rec;
    }
  } as unknown as ManifestStore;
  const harvest: IdHarvestDeps = {
    manifest,
    liveIds: new Map([[rec.id, TARGET]]),
    idCaptureWatches: new Map(),
    isDisposed: () => false,
    broadcastSessions: () => undefined
  };
  const readProcess: ProcessReader = {
    stat: (pid) => {
      const row = processes.get(pid);
      return Promise.resolve(
        row === undefined ? null : { stat: row.stat, ppid: row.ppid }
      );
    },
    children: (pid) => Promise.resolve(children.get(pid) ?? []),
    command: (pid) => Promise.resolve(processes.get(pid)?.command ?? '')
  };

  const service = new ResumeInPlaceService({
    harvest,
    exec: (args) => {
      if (args[0] === 'display-message') {
        return Promise.resolve(
          [pane.paneId, String(pane.pid), pane.dead ? '1' : '0', pane.command].join(
            '\t'
          )
        );
      }
      if (args[0] === 'capture-pane') return Promise.resolve(screen.text);
      throw new Error(`this test answers no tmux verb called ${String(args[0])}`);
    },
    publish: (updates) => {
      published.push(...updates);
    },
    readProcess,
    typeInto: (_target, text) => {
      typed.push(text);
      // The shell echoes what tmux delivered, which is what the read back sees.
      // `echoes` is how many copies the screen gains from ONE send, so a test
      // can drive a genuine double delivery, which is the only thing the twice
      // landing is for.
      for (let i = 0; i < echoes; i += 1) screen.text += text;
      return Promise.resolve();
    },
    claudeSessionsDir: '/nonexistent-claude-sessions',
    agyBrainRoot: '/nonexistent-agy-brain',
    now: () => clock.at,
    onResolved: (sessionId, outcome) => {
      resolved.push({ sessionId, outcome });
    }
  });

  return {
    service,
    published,
    typed,
    screen,
    pane,
    processes,
    children,
    clock,
    resolved,
    writes
  };
}

beforeEach(() => {
  forgetConversationClaims();
});

describe('a session Tortie only restored never offers the verb', () => {
  it('says nothing at all about a session it was never told about', () => {
    const world = makeWorld();
    // This is the whole restored-session shape: the login shell holds the
    // terminal, nothing is under it, the screen shows a prompt, and the
    // recorded resume command is sitting on that prompt unpressed.
    world.screen.text =
      'Gregs-MacBook-Pro-2% /usr/local/bin/claude --resume ' + CONVERSATION;
    expect(world.service.handbackOf('sess-1')).toBe('none');
    expect(world.service.handbackSnapshot()).toEqual([]);
    expect(world.published).toEqual([]);
  });

  it('refuses to type into it, however much it looks like a drop', async () => {
    const world = makeWorld();
    const result = await world.service.resumeInPlace('sess-1');
    expect(result.refusal).toBe('not-dropped');
    expect(result.landing).toBeNull();
    expect(world.typed).toEqual([]);
  });
});

describe('the drop, and the one row the verb appears on', () => {
  it('offers the verb only after the poll reports the witness gone', () => {
    const world = makeWorld();
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    expect(world.service.handbackOf('sess-1')).toBe('left');
    expect(world.published).toEqual([
      { sessionId: 'sess-1', handback: { state: 'left', leftAt: 900 } }
    ]);
  });

  it('tells a window once per edge and not once per tick', () => {
    const world = makeWorld();
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    world.service.noteHandback('sess-1', { kind: 'left', at: 901, leftAt: 900 });
    world.service.noteHandback('sess-1', { kind: 'left', at: 902, leftAt: 900 });
    expect(world.published).toHaveLength(1);
  });

  it('ignores a return for a session it never saw drop', () => {
    const world = makeWorld();
    world.service.noteHandback('sess-1', {
      kind: 'returning',
      at: 900,
      leftAt: 900,
      pid: 5555,
      command: '/usr/local/bin/claude'
    });
    expect(world.service.handbackOf('sess-1')).toBe('none');
    expect(world.published).toEqual([]);
  });

  it('forgets a session that no longer has a live pane on this Mac', () => {
    const world = makeWorld();
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    world.published.length = 0;
    // What a kill, a Remove or a reap leaves behind: the row is gone from the
    // live id map, and nothing else told this module anything.
    (world.service as unknown as { deps: { harvest: IdHarvestDeps } }).deps.harvest.liveIds.delete(
      'sess-1'
    );
    world.service.noteHandback('sess-2', { kind: 'left', at: 950, leftAt: 950 });
    expect(world.service.handbackOf('sess-1')).toBe('none');
    expect(world.published).toContainEqual({
      sessionId: 'sess-1',
      handback: { state: 'none' }
    });
  });
});

describe('the press, and the re-read that guards it', () => {
  it('types the recorded command with no Enter and reports it armed', async () => {
    const world = makeWorld();
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    const result = await world.service.resumeInPlace('sess-1');
    expect(result.refusal).toBeNull();
    expect(result.landing).toBe('armed');
    expect(result.before).toBe(0);
    expect(result.after).toBe(1);
    // The real composer, so this is the text a person would see.
    expect(world.typed).toEqual([
      `/usr/local/bin/claude --resume ${CONVERSATION}`
    ]);
    // No newline and no carriage return anywhere in it. A newline typed this
    // way IS Enter, and this path never presses Enter.
    expect(world.typed[0]).not.toMatch(/[\r\n]/u);
  });

  // CORRECTED AT INTEGRATION. This case used to expect `twice` from a screen
  // that already carried one copy, and the shipped rule answers `armed` for it,
  // so the test was red. The shipped rule is the right one and the expectation
  // was wrong. The landing is decided from the DIFFERENCE the send made, and it
  // has to be, because agents print the resume command as they leave: a screen
  // naming the command once is the ordinary screen of a session whose agent has
  // just gone, and counting copies rather than the difference would call every
  // first press a double.
  it('reads its own copy against the one the agent left on the screen', async () => {
    const world = makeWorld();
    world.screen.text += `The agent left. To come back: /usr/local/bin/claude --resume ${CONVERSATION}`;
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    const result = await world.service.resumeInPlace('sess-1');
    expect(result.before).toBe(1);
    expect(result.after).toBe(2);
    expect(result.landing).toBe('armed');
  });

  it('reports twice when one send put two copies on the line', async () => {
    // The real shape of it: the person chose Resume twice, or the send was
    // delivered twice, and the line now holds the command end to end with
    // itself. Nothing ran, because nothing ever presses Enter, and the sentence
    // asks them to clear the line and choose it again.
    const world = makeWorld(rowOf(), 2);
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    const result = await world.service.resumeInPlace('sess-1');
    expect(result.before).toBe(0);
    expect(result.after).toBe(2);
    expect(result.landing).toBe('twice');
  });

  it('refuses when the session is dead, having typed nothing', async () => {
    const world = makeWorld();
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    world.pane.dead = true;
    const result = await world.service.resumeInPlace('sess-1');
    expect(result.refusal).toBe('not-here');
    expect(world.typed).toEqual([]);
  });

  it('refuses when the session’s own process no longer holds the terminal', async () => {
    const world = makeWorld();
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    // Some other program owns the terminal, which is exactly where an armed
    // text reaches a raw mode reader with no Enter at all.
    world.processes.set(SHELL_PID, { stat: 'Ss', ppid: 1, command: '-zsh' });
    const result = await world.service.resumeInPlace('sess-1');
    expect(result.refusal).toBe('running');
    expect(world.typed).toEqual([]);
  });

  it('refuses when anything at all is running in the session', async () => {
    const world = makeWorld();
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    world.children.set(SHELL_PID, [9001]);
    world.processes.set(9001, { stat: 'S+', ppid: SHELL_PID, command: 'npm test' });
    const result = await world.service.resumeInPlace('sess-1');
    expect(result.refusal).toBe('running');
    expect(world.typed).toEqual([]);
  });

  it('says the agent is back when the thing running IS the agent', async () => {
    const world = makeWorld();
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    world.children.set(SHELL_PID, [9002]);
    world.processes.set(9002, {
      stat: 'S+',
      ppid: SHELL_PID,
      command: `/usr/local/bin/claude --resume ${CONVERSATION}`
    });
    const result = await world.service.resumeInPlace('sess-1');
    expect(result.refusal).toBe('agent-back');
    expect(world.typed).toEqual([]);
  });

  it('refuses a row that records no conversation', async () => {
    const world = makeWorld(rowOf({ agentSessionId: undefined, resumeArgv: [] }));
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    const result = await world.service.resumeInPlace('sess-1');
    expect(result.refusal).toBe('no-conversation');
    expect(world.typed).toEqual([]);
  });

  it('refuses a command it could not compose from its own catalogue', async () => {
    // A resume argv carrying an element that is neither this row's own
    // conversation id nor a token in Tortie's compiled list for claude.
    const world = makeWorld(
      rowOf({
        resumeArgv: [
          '/usr/local/bin/claude',
          '--resume',
          CONVERSATION,
          '--not-a-compiled-flag'
        ]
      })
    );
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    const result = await world.service.resumeInPlace('sess-1');
    expect(result.refusal).toBe('not-composed');
    expect(world.typed).toEqual([]);
  });

  it('refuses a session that was always a plain shell', async () => {
    const world = makeWorld(
      rowOf({ agent: 'shell', agentSessionId: undefined, resumeArgv: [] })
    );
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    const result = await world.service.resumeInPlace('sess-1');
    expect(result.refusal).toBe('not-dropped');
    expect(world.typed).toEqual([]);
  });
});

describe('reading a conversation id off a command line', () => {
  it('finds the id in the form every agent prints as it leaves', () => {
    expect(
      conversationIdFromCommand(`claude --resume ${CONVERSATION}`)
    ).toBe(CONVERSATION);
  });

  it('finds it when the flag and the id are joined by an equals sign', () => {
    expect(
      conversationIdFromCommand(`gemini --resume=${CONVERSATION}`)
    ).toBe(CONVERSATION);
  });

  it('finds nothing in a command that names no conversation', () => {
    // Measured on the operator's own machine: two live codex processes, one
    // `codex resume` with no argument and one bare `codex`.
    expect(conversationIdFromCommand('codex resume')).toBeNull();
    expect(conversationIdFromCommand('codex')).toBeNull();
    expect(conversationIdFromCommand('')).toBeNull();
  });

  it('is not fooled by something that merely looks like an id', () => {
    expect(conversationIdFromCommand('claude --resume not-a-uuid')).toBeNull();
    expect(
      conversationIdFromCommand('claude --resume 7f891378-5855-4776-ae75')
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ADDED AT INTEGRATION. The publish is an edge, and an edge is lost on a window
// that was not listening when it went out. A window that reloads while a
// session sits dropped starts with an empty map, and a dropped session is quiet
// by definition, so no second edge would ever come. The heartbeat is what says
// again what is already true.
// ---------------------------------------------------------------------------

describe('saying again what is already true', () => {
  it('costs nothing at all while nothing has dropped', () => {
    const world = makeWorld();
    world.clock.at += 60_000;
    world.service.heartbeat();
    expect(world.published).toEqual([]);
  });

  it('repeats the whole map once the wait has passed, and not before', () => {
    const world = makeWorld();
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    world.published.length = 0;
    // The first call is inside the wait, counted from the moment the service
    // was built, so it says nothing.
    world.service.heartbeat();
    expect(world.published).toEqual([]);
    world.clock.at += 10_000;
    world.service.heartbeat();
    expect(world.published).toEqual([
      { sessionId: 'sess-1', handback: { state: 'left', leftAt: 900 } }
    ]);
  });

  it('reads no screen and no process to do it', async () => {
    const world = makeWorld();
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    const screenBefore = world.screen.text;
    world.clock.at += 10_000;
    world.service.heartbeat();
    await Promise.resolve();
    expect(world.typed).toEqual([]);
    expect(world.screen.text).toBe(screenBefore);
  });

  it('drops the record of a session that is no longer live, and says so once', () => {
    const world = makeWorld();
    world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
    world.published.length = 0;
    world.service.forget('sess-1');
    expect(world.published).toEqual([
      { sessionId: 'sess-1', handback: { state: 'none' } }
    ]);
    world.clock.at += 10_000;
    world.published.length = 0;
    world.service.heartbeat();
    expect(world.published).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ADDED AT INTEGRATION. The one second poll holds a handback state of its own
// and nothing was telling it when a return had been decided. A session it
// watched come back stayed `returning` in the poll for the rest of the run
// while the window had been told the answer seconds after it happened. Two
// states for one fact, and only one of them moving, is how they disagree.
// ---------------------------------------------------------------------------

/**
 * The settle wait is 1.8 s and nobody should spend that in a unit test, so the
 * timer is faked and NOTHING ELSE IS. The confirmation reads the file system on
 * its way past, and a file system answer is not a microtask, so a run that
 * faked every timer could reach the assertion before the read that decides the
 * answer had come back. That is exactly how this test was flaky when it was
 * written.
 */
function withFakeSettleTimer(): void {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
}

/**
 * A session that dropped and then had something start in it again, which is the
 * shape both cases below start from. `command` is what that process was
 * launched with, and an empty one is a process nothing can be read off.
 */
function droppedThenSomethingRan(world: World, command: string): void {
  world.service.noteHandback('sess-1', { kind: 'left', at: 900, leftAt: 900 });
  world.service.noteHandback('sess-1', {
    kind: 'returning',
    at: 1_000,
    leftAt: 900,
    pid: RETURNED_PID,
    command
  });
}

/** Move the faked timer on, then let the real work behind it finish. */
async function settle(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

describe('closing a handback tells the poll as well as the window', () => {
  it('adopts the session back when the returned command names its own conversation', async () => {
    withFakeSettleTimer();
    try {
      const world = makeWorld();
      const returned = `/usr/local/bin/claude --resume ${CONVERSATION}`;
      world.processes.set(RETURNED_PID, {
        stat: 'S+',
        ppid: SHELL_PID,
        command: returned
      });
      droppedThenSomethingRan(world, returned);
      expect(world.service.handbackOf('sess-1')).toBe('returning');
      // The settle wait comes first, because a resume that failed looks
      // exactly like one that never happened about a second later.
      await settle(2_500);
      expect(world.resolved).toEqual([
        { sessionId: 'sess-1', outcome: 'adopted' }
      ]);
      expect(world.service.handbackOf('sess-1')).toBe('none');
      // Nothing is drawn about this row again, which is the quiet answer.
      expect(world.published.at(-1)).toEqual({
        sessionId: 'sess-1',
        handback: { state: 'none' }
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('says so and writes nothing when the process did not survive', async () => {
    withFakeSettleTimer();
    try {
      const world = makeWorld();
      // Nothing is put in the process table for it, so the thing that ran is
      // already gone by the time the settle wait ends.
      droppedThenSomethingRan(world, '');
      await settle(2_500);
      // The session is back where it was, so the verb comes back with it and
      // the handback was never closed.
      expect(world.resolved).toEqual([]);
      expect(world.service.handbackOf('sess-1')).toBe('left');
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * THE WORST OUTCOME THIS PHASE EXISTS TO PREVENT, driven end to end by the
 * Tier 3 verifier and closed in the fix round.
 *
 * The first identity source reads a conversation id off the returning process's
 * command line. It never asked whether that process was the agent at all, so a
 * session whose agent left and whose row held no conversation would bind itself
 * to any id that appeared as a bare word on any command line the person ran.
 * `rg <id> ~/.claude/projects` is an ordinary thing to type and it wrote that
 * conversation onto the row, so a later Restore would have brought back a
 * conversation nobody ever resumed and hidden the real one.
 */
describe('a conversation id is only read off the AGENT', () => {
  const OTHER = 'b3376da6-7ca4-467e-a61a-b444d713e02c';

  it('writes nothing when an ordinary command carries an id', async () => {
    withFakeSettleTimer();
    try {
      const world = makeWorld(
        p141Row({ resumeArgv: ['/usr/local/bin/claude'] })
      );
      const returned = `rg ${OTHER} /Users/g/.claude/projects`;
      world.processes.set(RETURNED_PID, {
        stat: 'S+',
        ppid: SHELL_PID,
        command: returned
      });
      droppedThenSomethingRan(world, returned);
      await settle(2_500);
      expect(world.writes).toEqual([]);
      expect(world.service.handbackOf('sess-1')).toBe('returning');
    } finally {
      vi.useRealTimers();
    }
  });

  it('still reads the id off the agent command the person pasted', async () => {
    withFakeSettleTimer();
    try {
      const world = makeWorld(
        p141Row({ resumeArgv: ['/usr/local/bin/claude'] })
      );
      const returned = `/usr/local/bin/claude --resume ${OTHER}`;
      world.processes.set(RETURNED_PID, {
        stat: 'S+',
        ppid: SHELL_PID,
        command: returned
      });
      droppedThenSomethingRan(world, returned);
      await settle(2_500);
      expect(world.writes).toEqual([OTHER]);
      expect(world.resolved).toEqual([
        { sessionId: 'sess-1', outcome: 'adopted' }
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * Claude does not always delete its own record. One ended with SIGKILL, or one
 * that crashed, leaves the file behind naming a pane that is still there, and
 * the pane match used to overrule the id read off the process that was really
 * running. Tortie said the conversation was back when a different one was open.
 */
describe('claude\'s own record, and the stale one it leaves behind', () => {
  const LIVE = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
  const STALE = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

  function write(dir: string, pid: number, extra: Record<string, unknown>): void {
    writeFileSync(
      join(dir, `${String(pid)}.json`),
      JSON.stringify({ kind: 'interactive', pid, ...extra })
    );
  }

  it('ignores a record whose own process is gone', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-p141-claude-'));
    try {
      write(dir, 4242, { tmux: 'c1:@0.%12', sessionId: STALE });
      expect(
        await claudeConversationFor(dir, '%12', 9_000, () => false)
      ).toBe(null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('lets the record of the process that just appeared win outright', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-p141-claude-'));
    try {
      write(dir, 4242, { tmux: 'c1:@0.%12', sessionId: STALE });
      write(dir, 9_000, { tmux: 'c1:@0.%12', sessionId: LIVE });
      expect(
        await claudeConversationFor(dir, '%12', 9_000, () => true)
      ).toBe(LIVE);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('still answers a live record that names the pane', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-p141-claude-'));
    try {
      write(dir, 4242, { tmux: 'c1:@0.%12', sessionId: LIVE });
      expect(
        await claudeConversationFor(dir, '%12', 9_000, () => true)
      ).toBe(LIVE);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
