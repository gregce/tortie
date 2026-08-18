/**
 * Phase 72 — keeping a copy of what a session on another machine printed.
 *
 * Two halves, tested two ways.
 *
 * The CHOICE is pure, so it is tested exhaustively: which rows a pass reads,
 * in which order, and which it skips. Every rule there removes commands rather
 * than adding them, and each one gets its own case.
 *
 * The PASS spawns nothing here. The exec plane, the control plane, the feed and
 * the snapshot store are all replaced, so what these tests hold is the shape of
 * the pass rather than the behaviour of tmux: at most one read in flight per
 * machine, at most eight reads in a pass, nothing at all while the link is down,
 * and a pass that stops between reads when the machine is forgotten.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a real machine answers, that
 * the bytes come back whole, or that the cadence holds under thirty sessions on
 * one link. `npm run smoke:matrix` row 9 measures that against a real sign in
 * server and prints the command count.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session, SessionStatus } from '@shared/types';

// ---------------------------------------------------------------------------
// The world this module lives in, replaced
// ---------------------------------------------------------------------------

let live = new Set<string>();
let answering = new Set<string>();
let rows: Array<{
  id: string;
  machineId: string;
  tmuxId: string;
  activityAt: number;
  cwd: string;
  status: SessionStatus;
}> = [];
let execCalls: string[][] = [];
let execAnswer: (args: readonly string[]) => string | Promise<string> = () =>
  'screen text\n';
let stored: Array<{
  sessionId: string;
  machineId?: string;
  reason?: string;
  skipIfIdentical?: boolean;
}> = [];

vi.mock('../control-plane', () => ({
  isControlPlaneLive: (machineId: string) => live.has(machineId),
  onMachineLinkChanged: () => () => undefined
}));

vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => {
    execCalls.push([...args]);
    return Promise.resolve(execAnswer(args));
  }
}));

vi.mock('../remote-sessions', () => ({
  readyRemoteContext: (machineId: string) => ({
    kind: 'remote',
    machineId
  }),
  remoteMachineFacts: (machineId: string) => ({
    answering: answering.has(machineId)
  }),
  remoteSessionRow: (sessionId: string) =>
    rows.find((one) => one.id === sessionId) ?? null,
  remoteSessions: (): Session[] =>
    rows.map((one) => ({
      id: one.id,
      name: one.id,
      tmuxName: one.id,
      projectPath: '/repo',
      cwd: one.cwd,
      agent: 'claude',
      status: one.status,
      createdAt: 0,
      machine: {
        id: one.machineId,
        label: one.machineId,
        color: 'blue' as const,
        answering: answering.has(one.machineId),
        canRestore: false,
        restoreReason: null
      }
    }))
}));

vi.mock('../../restore/snapshots', () => ({
  readCapsules: () => [],
  savedSnapshotLines: () => 10_000,
  storeCapsuleText: (input: {
    sessionId: string;
    machineId?: string;
    reason?: string;
    text: string;
    skipIfIdentical?: boolean;
  }) => {
    stored.push({
      sessionId: input.sessionId,
      ...(input.machineId !== undefined ? { machineId: input.machineId } : {}),
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      ...(input.skipIfIdentical !== undefined
        ? { skipIfIdentical: input.skipIfIdentical }
        : {})
    });
    return Promise.resolve(input.text.trim().length > 0);
  }
}));

const {
  REMOTE_CAPSULE_PER_PASS,
  captureMachineOnce,
  chooseCaptureTargets,
  remoteCaptureArgs,
  remoteCapsuleFacts,
  resetRemoteCapsulesForTests,
  stopCapturingMachine
} = await import('../remote-capsule');

const MACHINE = 'studio';

function row(
  id: string,
  over: Partial<{
    machineId: string;
    tmuxId: string;
    activityAt: number;
    status: SessionStatus;
  }> = {}
): (typeof rows)[number] {
  return {
    id,
    machineId: over.machineId ?? MACHINE,
    tmuxId: over.tmuxId ?? `$${id}`,
    activityAt: over.activityAt ?? 100,
    cwd: '/work',
    status: over.status ?? 'idle'
  };
}

beforeEach(() => {
  resetRemoteCapsulesForTests();
  live = new Set([MACHINE]);
  answering = new Set([MACHINE]);
  rows = [];
  execCalls = [];
  stored = [];
  execAnswer = () => 'screen text\n';
});

// ---------------------------------------------------------------------------
// The command
// ---------------------------------------------------------------------------

describe('the read', () => {
  it('is composed exactly as the local one is', () => {
    // src/main/tmux/sessions.ts composes the same flags in the same order for
    // a pane on this Mac. Same reader, same bytes.
    expect(remoteCaptureArgs('$7', 10_000)).toEqual([
      'capture-pane',
      '-p',
      '-e',
      '-J',
      '-t',
      '$7',
      '-S',
      '-10000'
    ]);
  });

  it('never asks for a negative or fractional depth', () => {
    expect(remoteCaptureArgs('$1', -5)[7]).toBe('-0');
    expect(remoteCaptureArgs('$1', 12.7)[7]).toBe('-12');
  });

  it('targets the far side identifier and never a name', () => {
    expect(remoteCaptureArgs('$4', 100)).toContain('$4');
    expect(remoteCaptureArgs('$4', 100)).not.toContain('=auth');
  });
});

// ---------------------------------------------------------------------------
// The choice, pure
// ---------------------------------------------------------------------------

describe('choosing what to read', () => {
  const listed = (id: string, activityAt: number): Parameters<
    typeof chooseCaptureTargets
  >[0][number] => ({ id, tmuxId: `$${id}`, activityAt, status: 'idle' });

  it('reads a row nothing has been read for yet', () => {
    expect(
      chooseCaptureTargets([listed('a', 5)], new Map()).map((x) => x.id)
    ).toEqual(['a']);
  });

  it('skips a row the last completed list did not hold', () => {
    for (const status of [
      'restorable',
      'unknown',
      'discarded',
      'exited'
    ] as const) {
      expect(
        chooseCaptureTargets(
          [{ id: 'a', tmuxId: '$a', activityAt: 5, status }],
          new Map()
        ),
        status
      ).toEqual([]);
    }
  });

  /**
   * PHASE 72 FIX ROUND. The rule this replaces skipped a row whose activity
   * stamp had not moved, and MEASURED 2026-08-17 with tmux 3.6a that stamp does
   * not move at all for a session nobody is attached to. Every session Tortie
   * copies is one nobody is attached to, so the rule skipped every session for
   * ever after its first copy. Whether the screen changed is decided on the
   * BYTES now, by the ring, and the read still happens.
   */
  it('reads a row again whatever its activity stamp says', () => {
    const memory = new Map([
      ['a', { machineId: MACHINE, capturedAt: 10, activityAt: 5 }]
    ]);
    expect(chooseCaptureTargets([listed('a', 5)], memory).map((x) => x.id)).toEqual([
      'a'
    ]);
    expect(
      chooseCaptureTargets([listed('a', 6)], memory).map((x) => x.id)
    ).toEqual(['a']);
  });

  it('reads the oldest copy first, and a row never copied before all of them', () => {
    const memory = new Map([
      ['b', { machineId: MACHINE, capturedAt: 300, activityAt: 1 }],
      ['c', { machineId: MACHINE, capturedAt: 100, activityAt: 1 }]
    ]);
    expect(
      chooseCaptureTargets(
        [listed('b', 9), listed('c', 9), listed('a', 9)],
        memory
      ).map((x) => x.id)
    ).toEqual(['a', 'c', 'b']);
  });

  it('breaks a tie on the id, so the order is the same on every run', () => {
    expect(
      chooseCaptureTargets(
        [listed('z', 1), listed('m', 1), listed('a', 1)],
        new Map()
      ).map((x) => x.id)
    ).toEqual(['a', 'm', 'z']);
  });

  it('takes at most eight, whatever the machine holds', () => {
    const thirty = Array.from({ length: 30 }, (_, i) =>
      listed(`s${String(i).padStart(2, '0')}`, 1)
    );
    const chosen = chooseCaptureTargets(thirty, new Map());
    expect(chosen).toHaveLength(REMOTE_CAPSULE_PER_PASS);
    expect(REMOTE_CAPSULE_PER_PASS).toBe(8);
  });

  it('never compares a remote clock with this Mac’s', () => {
    // The activity stamp is the other machine's clock and the copy instant is
    // this Mac's. Nothing here puts the two in one comparison, so a machine two
    // days ahead is read in exactly the same order as a machine in step.
    const skew = 48 * 60 * 60 * 1000;
    const ahead = new Map([
      ['a', { machineId: MACHINE, capturedAt: 100, activityAt: skew }],
      ['b', { machineId: MACHINE, capturedAt: 200, activityAt: skew }]
    ]);
    const inStep = new Map([
      ['a', { machineId: MACHINE, capturedAt: 100, activityAt: 1 }],
      ['b', { machineId: MACHINE, capturedAt: 200, activityAt: 1 }]
    ]);
    const order = (memory: typeof ahead): string[] =>
      chooseCaptureTargets([listed('b', skew), listed('a', skew)], memory).map(
        (x) => x.id
      );
    expect(order(ahead)).toEqual(['a', 'b']);
    expect(order(inStep)).toEqual(['a', 'b']);
  });
});

// ---------------------------------------------------------------------------
// The pass
// ---------------------------------------------------------------------------

describe('one pass over one machine', () => {
  it('reads every listed row and stores each copy against the machine', async () => {
    rows = [row('a'), row('b')];
    const written = await captureMachineOnce(MACHINE);
    expect(written).toBe(2);
    expect(execCalls).toHaveLength(2);
    expect(stored.map((one) => one.sessionId).sort()).toEqual(['a', 'b']);
    for (const one of stored) {
      expect(one.machineId).toBe(MACHINE);
      expect(one.reason).toBe('remote-checkpoint');
    }
  });

  it('sends nothing at all while the link is down', async () => {
    rows = [row('a')];
    live = new Set();
    expect(await captureMachineOnce(MACHINE)).toBe(0);
    expect(execCalls).toEqual([]);
    expect(stored).toEqual([]);
  });

  it('sends nothing while the machine is not answering', async () => {
    rows = [row('a')];
    answering = new Set();
    expect(await captureMachineOnce(MACHINE)).toBe(0);
    expect(execCalls).toEqual([]);
  });

  it('sends at most eight reads for thirty sessions on one link', async () => {
    rows = Array.from({ length: 30 }, (_, i) =>
      row(`s${String(i).padStart(2, '0')}`)
    );
    await captureMachineOnce(MACHINE);
    expect(execCalls).toHaveLength(8);
  });

  /**
   * PHASE 72 FIX ROUND. The read happens on every pass, because nothing on the
   * far side can tell Tortie whether a screen changed without reading it. What
   * does not happen is a new copy: the ring is asked to skip a body identical
   * to the newest one it already holds, and the ring answers false.
   */
  it('reads every pass and asks the ring to skip an identical screen', async () => {
    rows = [row('a'), row('b')];
    await captureMachineOnce(MACHINE);
    execCalls = [];
    stored = [];
    await captureMachineOnce(MACHINE);
    expect(execCalls).toHaveLength(2);
    expect(stored.every((one) => one.skipIfIdentical === true)).toBe(true);
  });

  it('keeps one read in flight per machine and refuses a second pass', async () => {
    rows = [row('a'), row('b')];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    execAnswer = () => gate.then(() => 'text\n');

    const first = captureMachineOnce(MACHINE);
    // The second call finds a pass in flight and returns at once, having sent
    // nothing. One link, one read.
    expect(await captureMachineOnce(MACHINE)).toBe(0);
    expect(remoteCapsuleFacts().inFlight).toEqual([MACHINE]);
    expect(execCalls).toHaveLength(1);
    release();
    expect(await first).toBe(2);
    expect(remoteCapsuleFacts().inFlight).toEqual([]);
  });

  it('stops between reads when the machine is forgotten', async () => {
    rows = [row('a'), row('b'), row('c')];
    let seen = 0;
    execAnswer = () => {
      seen += 1;
      if (seen === 1) stopCapturingMachine(MACHINE);
      return 'text\n';
    };
    const written = await captureMachineOnce(MACHINE);
    // The first read completes and is thrown away, because the pass checks its
    // own generation again after the read and before the write.
    expect(written).toBe(0);
    expect(execCalls).toHaveLength(1);
    expect(stored).toEqual([]);
  });

  it('carries on past a read that failed, and stores nothing for it', async () => {
    rows = [row('a'), row('b')];
    let call = 0;
    execAnswer = () => {
      call += 1;
      if (call === 1) return Promise.reject(new Error('no answer'));
      return 'text\n';
    };
    expect(await captureMachineOnce(MACHINE)).toBe(1);
    expect(execCalls).toHaveLength(2);
    expect(stored).toHaveLength(1);
  });

  it('writes nothing for an empty screen and still remembers it', async () => {
    rows = [row('a')];
    execAnswer = () => '';
    expect(await captureMachineOnce(MACHINE)).toBe(0);
    expect(remoteCapsuleFacts().remembered).toBe(1);
  });

  it('forgets what it copied for a machine a person removed', async () => {
    rows = [row('a'), row('b', { machineId: 'attic' })];
    live = new Set([MACHINE, 'attic']);
    answering = new Set([MACHINE, 'attic']);
    await captureMachineOnce(MACHINE);
    await captureMachineOnce('attic');
    expect(remoteCapsuleFacts().remembered).toBe(2);
    stopCapturingMachine(MACHINE);
    expect(remoteCapsuleFacts().remembered).toBe(1);
  });

  it('touches no other machine when one machine is read', async () => {
    rows = [row('a'), row('b', { machineId: 'attic' })];
    live = new Set([MACHINE, 'attic']);
    answering = new Set([MACHINE, 'attic']);
    await captureMachineOnce(MACHINE);
    expect(stored.map((one) => one.sessionId)).toEqual(['a']);
    expect(execCalls).toHaveLength(1);
  });
});
