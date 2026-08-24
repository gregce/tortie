/**
 * Who owns the long running ssh children (Phase 118, item 1).
 *
 * NOTHING HERE SPAWNS AN SSH CHILD. The ledger is handed a fake child that
 * records the signals it was sent, so every property below is about what Tortie
 * does with a child rather than about what ssh does. What a real quit does to a
 * real ssh child running a real clone is `npm run smoke:p118`, which counts the
 * far side with `/bin/ps` and reads the pid dead afterwards.
 *
 * The journal is a plain object with the three methods the ledger uses, so the
 * classification and the durable write are tested apart. The table itself is
 * `../../manifest/__tests__/remote-executions.test.ts`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { GmuxError } from '../../errors';

const posted: unknown[] = [];

vi.mock('../../notice', () => ({
  postDurabilityNotice: (notice: unknown): boolean => {
    posted.push(notice);
    return true;
  }
}));

const {
  CANCEL_GRACE_MS,
  REMOTE_EXEC_NOT_RECORDED,
  REMOTE_EXEC_SHUTDOWN,
  admitRemoteExecution,
  isRemoteExecUnjournaled,
  beginRemoteExecutionShutdown,
  cancelRemoteExecutions,
  joinRemoteExecutions,
  liveRemoteExecutions,
  remoteExecutionsAccepted,
  resetRemoteExecutionLedgerForTests,
  resolveCutOffRemoteExecutions,
  setRemoteExecutionJournal,
  settledRemoteExecutions
} = await import('../execution-ledger');

type Journal = NonNullable<Parameters<typeof setRemoteExecutionJournal>[0]>;

/** Every signal one fake child was sent, and every stream it had destroyed. */
interface FakeChild {
  readonly signals: string[];
  /** The stream names destroyed, in the order the cancel path destroyed them. */
  readonly destroyed: string[];
  readonly handle: ChildProcess;
}

function fakeChild(pid = 4321): FakeChild {
  const signals: string[] = [];
  const destroyed: string[] = [];
  const stream = (name: string): unknown => ({
    destroy: (): void => {
      destroyed.push(name);
    }
  });
  const handle = {
    pid,
    stdout: stream('stdout'),
    stderr: stream('stderr'),
    stdin: stream('stdin'),
    kill: (signal?: string): boolean => {
      signals.push(signal ?? 'SIGTERM');
      return true;
    }
  } as unknown as ChildProcess;
  return { signals, destroyed, handle };
}

/** A promise the test settles by hand, so a join has something to wait on. */
function deferred(): {
  promise: Promise<string>;
  resolve: (value: string) => void;
  reject: (err: Error) => void;
} {
  let resolve = (_: string): void => undefined;
  let reject = (_: Error): void => undefined;
  const promise = new Promise<string>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  resetRemoteExecutionLedgerForTests();
  // A journal that accepts every write, because since Phase 144 a clone with
  // no journal is REFUSED rather than started, and most tests here are about
  // the lifecycle rather than the journal. The tests about the journal itself
  // install their own instrumented one over this.
  setRemoteExecutionJournal(fakeJournal().store);
  posted.length = 0;
});

afterEach(() => {
  resetRemoteExecutionLedgerForTests();
});

describe('the refusal', () => {
  it('refuses after shutdown began, and never calls the work', async () => {
    let ran = 0;
    beginRemoteExecutionShutdown();
    expect(remoteExecutionsAccepted()).toBe(false);
    let payload: GmuxError['payload'] | null = null;
    try {
      await admitRemoteExecution(
        { machineId: 'studio', kind: 'clone', subject: '/Users/gdc/gmux' },
        async () => {
          ran += 1;
          return 'never';
        }
      );
    } catch (err) {
      payload = err instanceof GmuxError ? err.payload : null;
    }
    expect(ran).toBe(0);
    expect(payload?.code).toBe('SHUTTING_DOWN');
    expect(payload?.message).toBe(REMOTE_EXEC_SHUTDOWN);
    // A refused call opens no entry, so it can never be joined or journaled.
    expect(liveRemoteExecutions()).toHaveLength(0);
    expect(settledRemoteExecutions()).toHaveLength(0);
  });

  it('says one plain sentence with no dash in it', () => {
    expect(REMOTE_EXEC_SHUTDOWN).toBe(
      'Tortie is quitting, so nothing more was sent to that machine.'
    );
    expect(REMOTE_EXEC_SHUTDOWN).not.toContain('—');
    expect(REMOTE_EXEC_SHUTDOWN).not.toContain('–');
  });
});

describe('work admitted before the flag', () => {
  it('still runs, and the caller keeps its own value', async () => {
    const out = await admitRemoteExecution(
      {
        machineId: 'studio',
        kind: 'capture',
        subject: 'auth',
        machineLabel: 'Studio'
      },
      async () => 'what the machine said'
    );
    expect(out).toBe('what the machine said');
    const facts = settledRemoteExecutions();
    expect(facts).toHaveLength(1);
    expect(facts[0]?.outcome).toBe('answered');
    expect(facts[0]?.machineLabel).toBe('Studio');
    expect(facts[0]?.seq).toBe(1);
  });

  it('keeps the caller its own error, and records the work as failed', async () => {
    const boom = new Error('the link dropped');
    await expect(
      admitRemoteExecution(
        { machineId: 'studio', kind: 'harvest', subject: 'studio' },
        async () => {
          throw boom;
        }
      )
    ).rejects.toBe(boom);
    expect(settledRemoteExecutions()[0]?.outcome).toBe('failed');
  });

  it('settles work that was admitted before a later shutdown', async () => {
    const work = deferred();
    const held = admitRemoteExecution(
      { machineId: 'studio', kind: 'store-sync', subject: 's1' },
      async () => work.promise
    );
    beginRemoteExecutionShutdown();
    expect(liveRemoteExecutions()).toHaveLength(1);
    work.resolve('done');
    await expect(held).resolves.toBe('done');
    expect(settledRemoteExecutions()[0]?.outcome).toBe('answered');
  });

  /**
   * The label is passed in rather than looked up, so this file never imports
   * the machines store and its native file watcher. A caller that has no label
   * is recorded under the machine's id, which is still a true name for it.
   */
  it('records a caller that named no label under the machine id', async () => {
    await admitRemoteExecution(
      { machineId: 'nolabel', kind: 'command', subject: '' },
      async () => 'ok'
    );
    expect(settledRemoteExecutions()[0]?.machineLabel).toBe('nolabel');
    await admitRemoteExecution(
      { machineId: 'nolabel', kind: 'command', subject: '', machineLabel: '' },
      async () => 'ok'
    );
    expect(settledRemoteExecutions()[1]?.machineLabel).toBe('nolabel');
  });
});

describe('cancelling', () => {
  it('signals every owned child, marks it cut off, and counts them', async () => {
    const child = fakeChild(9001);
    const work = deferred();
    const held = admitRemoteExecution(
      { machineId: 'studio', kind: 'clone', subject: '/Users/gdc/gmux' },
      async (hold) => {
        hold.own(child.handle);
        return work.promise;
      }
    );
    await Promise.resolve();
    expect(liveRemoteExecutions()[0]?.pid).toBe(9001);

    expect(cancelRemoteExecutions()).toBe(1);
    expect(child.signals).toEqual(['SIGTERM']);

    // The child dies, so the spawn rejects, exactly as execFile does.
    work.reject(new Error('Command failed: ssh ... SIGTERM'));
    await expect(held).rejects.toThrow();
    const fact = settledRemoteExecutions()[0];
    expect(fact?.outcome).toBe('cutOff');
    expect(fact?.pid).toBe(9001);
  });

  it('signals the child pid and never a process group', async () => {
    // `execFile` does not forward `detached`, so its child sits in Electron's
    // own process group. A negative pid here would signal Tortie itself.
    const child = fakeChild(-1);
    const killSpy = vi.spyOn(process, 'kill');
    const work = deferred();
    const held = admitRemoteExecution(
      { machineId: 'studio', kind: 'clone', subject: '/x' },
      async (hold) => {
        hold.own(child.handle);
        return work.promise;
      }
    );
    await Promise.resolve();
    cancelRemoteExecutions();
    expect(killSpy).not.toHaveBeenCalled();
    killSpy.mockRestore();
    work.reject(new Error('gone'));
    await held.catch(() => undefined);
  });

  it('destroys the three streams, because the ssh master still holds them', async () => {
    // Every exec plane argv carries ControlMaster with a ControlPersist window,
    // so a background master process holds the write ends of these pipes. The
    // signal ends the command and the pipes stay open, so the close event the
    // spawn promise waits on never fires. Measured with no sshd listening, the
    // promise was unsettled 8,304 ms after the signal and settled in 304 ms
    // once the streams were destroyed. Without these three calls the quit
    // burns its whole 3,000 ms join bound and reports unjoined instead of
    // cutOff.
    const child = fakeChild(9100);
    const work = deferred();
    const held = admitRemoteExecution(
      { machineId: 'studio', kind: 'clone', subject: '/x' },
      async (hold) => {
        hold.own(child.handle);
        return work.promise;
      }
    );
    await Promise.resolve();
    cancelRemoteExecutions();
    expect(child.destroyed).toEqual(['stdout', 'stderr', 'stdin']);
    work.reject(new Error('Command failed: ssh ... SIGTERM'));
    await held.catch(() => undefined);
  });

  it('counts nothing when no entry owns a child yet', () => {
    void admitRemoteExecution(
      { machineId: 'studio', kind: 'clone', subject: '/x' },
      async () => new Promise<string>(() => undefined)
    );
    expect(cancelRemoteExecutions()).toBe(0);
  });

  it('escalates to SIGKILL after the grace, and the grace is 250 ms', async () => {
    vi.useFakeTimers();
    try {
      const child = fakeChild();
      void admitRemoteExecution(
        { machineId: 'studio', kind: 'clone', subject: '/x' },
        async (hold) => {
          hold.own(child.handle);
          return new Promise<string>(() => undefined);
        }
      );
      await Promise.resolve();
      cancelRemoteExecutions();
      expect(CANCEL_GRACE_MS).toBe(250);
      vi.advanceTimersByTime(CANCEL_GRACE_MS + 1);
      expect(child.signals).toEqual(['SIGTERM', 'SIGKILL']);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('joining', () => {
  it('returns at once with zeroes when nothing is open', async () => {
    const from = Date.now();
    const report = await joinRemoteExecutions(5_000);
    expect(report).toEqual({
      cancelled: 0,
      joined: 0,
      unjoined: 0,
      waitedMs: 0
    });
    expect(Date.now() - from).toBeLessThan(1_000);
  });

  it('returns at the bound with unjoined work, and measures the wait', async () => {
    void admitRemoteExecution(
      { machineId: 'studio', kind: 'clone', subject: '/x' },
      async () => new Promise<string>(() => undefined)
    );
    const report = await joinRemoteExecutions(30);
    expect(report.unjoined).toBe(1);
    expect(report.joined).toBe(0);
    expect(report.waitedMs).toBeGreaterThanOrEqual(20);
    // "Could not wait" is a different fact from "it was cut off", and the
    // ledger uses a different word for it.
    expect(settledRemoteExecutions()[0]?.outcome).toBe('unjoined');
  });

  it('returns as soon as the open work settles', async () => {
    const work = deferred();
    const held = admitRemoteExecution(
      { machineId: 'studio', kind: 'capture', subject: 'auth' },
      async () => work.promise
    );
    setTimeout(() => work.resolve('ok'), 5);
    const report = await joinRemoteExecutions(5_000);
    expect(report.joined).toBe(1);
    expect(report.unjoined).toBe(0);
    expect(report.waitedMs).toBeLessThan(4_000);
    await held;
  });
});

// ---------------------------------------------------------------------------
// The durable half, and it is only the clone
// ---------------------------------------------------------------------------

interface JournalRow {
  id: number;
  machineId: string;
  machineLabel: string;
  kind: string;
  subject: string;
  startedAt: number;
  outcome: string | null;
}

function fakeJournal(): { rows: JournalRow[]; store: Journal } {
  const rows: JournalRow[] = [];
  const store = {
    beginRemoteExecution: (
      input: {
        machineId: string;
        machineLabel: string;
        kind: string;
        subject: string;
      },
      at = 1_700_000_000_000
    ): number => {
      const id = rows.length + 1;
      rows.push({ id, ...input, startedAt: at, outcome: null });
      return id;
    },
    finishRemoteExecution: (id: number, outcome: string): void => {
      const row = rows.find((r) => r.id === id);
      if (row !== undefined && row.outcome === null) row.outcome = outcome;
    },
    listUnfinishedRemoteExecutions: () =>
      rows
        .filter((r) => r.outcome === null)
        .map((r) => ({ ...r, kind: r.kind, outcome: null, finishedAt: null }))
  } as unknown as Journal;
  return { rows, store };
}

describe('what is written down', () => {
  it('journals a copy and nothing else', async () => {
    const journal = fakeJournal();
    setRemoteExecutionJournal(journal.store);
    await admitRemoteExecution(
      {
        machineId: 'studio',
        kind: 'clone',
        subject: '/Users/gdc/gmux',
        machineLabel: 'Studio'
      },
      async () => 'cloned'
    );
    for (const kind of ['capture', 'harvest', 'store-sync', 'command'] as const) {
      await admitRemoteExecution(
        { machineId: 'studio', kind, subject: 'x' },
        async () => 'ok'
      );
    }
    expect(journal.rows).toHaveLength(1);
    expect(journal.rows[0]?.kind).toBe('clone');
    expect(journal.rows[0]?.subject).toBe('/Users/gdc/gmux');
    // Every one of the five is still classified in memory.
    expect(settledRemoteExecutions()).toHaveLength(5);
  });

  it('closes the copy row with how it ended', async () => {
    const journal = fakeJournal();
    setRemoteExecutionJournal(journal.store);
    await admitRemoteExecution(
      { machineId: 'studio', kind: 'clone', subject: '/x' },
      async () => 'cloned'
    );
    expect(journal.rows[0]?.outcome).toBe('answered');
  });

  it('closes the copy row when the copy failed while somebody was listening', async () => {
    const journal = fakeJournal();
    setRemoteExecutionJournal(journal.store);
    await admitRemoteExecution(
      { machineId: 'studio', kind: 'clone', subject: '/x' },
      async () => {
        throw new Error('git refused');
      }
    ).catch(() => undefined);
    expect(journal.rows[0]?.outcome).toBe('failed');
  });

  /**
   * THIS IS THE PROPERTY THE WHOLE JOURNAL EXISTS FOR. A copy the quit cut off
   * leaves its row OPEN, so the next launch reads it and says one sentence about
   * a folder that may be partly copied on another computer. A row closed at quit
   * time would never be read again and the person would never be told.
   */
  it('leaves the copy row open when the quit cut it off', async () => {
    const journal = fakeJournal();
    setRemoteExecutionJournal(journal.store);
    const child = fakeChild();
    const work = deferred();
    const held = admitRemoteExecution(
      { machineId: 'studio', kind: 'clone', subject: '/x' },
      async (hold) => {
        hold.own(child.handle);
        return work.promise;
      }
    );
    await Promise.resolve();
    expect(cancelRemoteExecutions()).toBe(1);
    work.reject(new Error('Command failed: ssh ... SIGTERM'));
    const report = await joinRemoteExecutions(500);
    await held.catch(() => undefined);
    expect(report.cancelled).toBe(1);
    expect(report.unjoined).toBe(0);
    expect(settledRemoteExecutions()[0]?.outcome).toBe('cutOff');
    expect(journal.rows[0]?.outcome).toBeNull();
  });

  it('leaves the copy row open when the join gave up waiting', async () => {
    const journal = fakeJournal();
    setRemoteExecutionJournal(journal.store);
    const child = fakeChild();
    void admitRemoteExecution(
      { machineId: 'studio', kind: 'clone', subject: '/x' },
      async (hold) => {
        hold.own(child.handle);
        return new Promise<string>(() => undefined);
      }
    );
    await Promise.resolve();
    cancelRemoteExecutions();
    const report = await joinRemoteExecutions(20);
    expect(report.unjoined).toBe(1);
    expect(settledRemoteExecutions()[0]?.outcome).toBe('unjoined');
    expect(journal.rows[0]?.outcome).toBeNull();
  });

  /**
   * PHASE 144, STAGE 2 OF THE 36 PLAN. This test replaces one named "never
   * lets a journal that will not write stop the work", which protected the
   * fail open behaviour: the ledger logged the failed write and started the
   * copy anyway, so a copy cut off later had no row and the next launch could
   * explain nothing. The copy is the one kind that writes on the other
   * computer, so its durable declaration completes before the spawn closure
   * runs or the copy does not start at all.
   */
  it('refuses a copy whose start row cannot be written, before the work runs', async () => {
    setRemoteExecutionJournal({
      beginRemoteExecution: () => {
        throw new Error('the disk is full');
      },
      finishRemoteExecution: () => undefined,
      listUnfinishedRemoteExecutions: () => []
    } as unknown as Journal);
    let ran = 0;
    let payload: GmuxError['payload'] | null = null;
    try {
      await admitRemoteExecution(
        { machineId: 'studio', kind: 'clone', subject: '/x' },
        async () => {
          ran += 1;
          return 'never';
        }
      );
    } catch (err) {
      payload = err instanceof GmuxError ? err.payload : null;
    }
    expect(ran).toBe(0);
    expect(payload?.code).toBe('FS_FAILED');
    expect(payload?.message).toBe(REMOTE_EXEC_NOT_RECORDED);
    expect(payload?.detail).toContain('the disk is full');
    // A refused copy opens no entry, so nothing can be joined, cancelled or
    // classified for it, and the quit has nothing of it to own.
    expect(liveRemoteExecutions()).toHaveLength(0);
    expect(settledRemoteExecutions()).toHaveLength(0);
  });

  it('refuses a copy when no journal is installed at all', async () => {
    setRemoteExecutionJournal(null);
    let ran = 0;
    await expect(
      admitRemoteExecution(
        { machineId: 'studio', kind: 'clone', subject: '/x' },
        async () => {
          ran += 1;
          return 'never';
        }
      )
    ).rejects.toSatisfy((err: unknown) => isRemoteExecUnjournaled(err));
    expect(ran).toBe(0);
    expect(liveRemoteExecutions()).toHaveLength(0);
    expect(settledRemoteExecutions()).toHaveLength(0);
  });

  it('lets every non journaled kind keep its path when the journal is gone', async () => {
    // Capture, harvest, store sync and plain commands are reads a later pass
    // redoes, so they need no row and a broken journal must not stop them.
    setRemoteExecutionJournal(null);
    for (const kind of ['capture', 'harvest', 'store-sync', 'command'] as const) {
      await expect(
        admitRemoteExecution(
          { machineId: 'studio', kind, subject: 'x' },
          async () => 'ok'
        )
      ).resolves.toBe('ok');
    }
    expect(settledRemoteExecutions()).toHaveLength(4);
    expect(
      settledRemoteExecutions().every((one) => one.outcome === 'answered')
    ).toBe(true);
  });

  it('says one plain refusal sentence with no dash in it', () => {
    expect(REMOTE_EXEC_NOT_RECORDED).toBe(
      'Tortie could not write down that this work was starting, so nothing ' +
        'was sent to that machine. Try again.'
    );
    expect(REMOTE_EXEC_NOT_RECORDED).not.toContain('—');
    expect(REMOTE_EXEC_NOT_RECORDED).not.toContain('–');
  });

  it('recognises only its own refusal', () => {
    expect(isRemoteExecUnjournaled(new Error(REMOTE_EXEC_NOT_RECORDED))).toBe(
      false
    );
    expect(
      isRemoteExecUnjournaled(
        new GmuxError('FS_FAILED', 'some other filesystem failure')
      )
    ).toBe(false);
    expect(
      isRemoteExecUnjournaled(
        new GmuxError('FS_FAILED', REMOTE_EXEC_NOT_RECORDED, 'why')
      )
    ).toBe(true);
  });
});

describe('the boot read', () => {
  it('says nothing when nothing was left open', () => {
    const journal = fakeJournal();
    expect(resolveCutOffRemoteExecutions(journal.store)).toEqual([]);
    expect(posted).toHaveLength(0);
  });

  it('closes every open row and posts exactly one notice', () => {
    const journal = fakeJournal();
    journal.store.beginRemoteExecution(
      {
        machineId: 'studio',
        machineLabel: 'Studio',
        kind: 'clone',
        subject: '/Users/gdc/one'
      },
      1_700_000_000_000
    );
    journal.store.beginRemoteExecution(
      {
        machineId: 'mini',
        machineLabel: 'Mac mini',
        kind: 'clone',
        subject: '/Users/gdc/two'
      },
      1_700_000_100_000
    );
    const found = resolveCutOffRemoteExecutions(journal.store);
    expect(found).toHaveLength(2);
    expect(journal.rows.every((r) => r.outcome === 'cutOff')).toBe(true);
    expect(posted).toEqual([
      {
        kind: 'remote-work-cut-off',
        // The NEWEST row, and the label off the row rather than looked up,
        // because the machine may have been removed since.
        machineLabel: 'Mac mini',
        path: '/Users/gdc/two',
        count: 2
      }
    ]);
    // Said once and never again.
    expect(resolveCutOffRemoteExecutions(journal.store)).toEqual([]);
  });
});
