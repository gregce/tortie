/**
 * Every `machines:*` channel, and the four sentences that decide whether this
 * phase is safe.
 *
 * THE TITLE USED TO SAY THIRTEEN, which was true when Phase 68 wrote it and
 * false from Phase 69 onward. Phase 99 took the number out rather than writing
 * a new one that goes stale in the same way. The array in the first test is the
 * fact, and it names every channel or it names none.
 *
 *  1. `machines:test` in `saved` mode asks the gate BEFORE it spawns anything.
 *     A machine nobody confirmed refuses, and node-pty is never called.
 *  2. `machines:add` refuses a stale hash and writes NOTHING, so a sheet that
 *     went out of date cannot add a machine a person never read.
 *  3. `machines:rows` opens no file. It reads what the store already has.
 *  4. PHASE 79.1. `machines:installKey` refuses a stale hash and a machine with
 *     no name, and in both cases nothing is spawned and no key is made.
 *
 * node-pty is replaced by a stand in that RECORDS rather than only counts. It
 * keeps the callbacks the module handed it, so a test can make the program
 * print what a real one prints and then exit, which is how the key block on the
 * outcome is driven without any connection.
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMain, IpcMainInvokeEvent } from 'electron';

let userData = '';
let keystore = true;

const MARKER = ' tortie-test-key ';

/**
 * Every node-pty spawn this file caused. It must stay empty in most tests.
 *
 * Each row keeps the two callbacks the module registered, so a test can drive
 * the program's output and its exit. That is how a `refused` answer is produced
 * here without a machine, a network or a connection.
 */
interface SpawnRecord {
  file: string;
  args: string[];
  written: string[];
  killed: boolean;
  data: ((chunk: string) => void) | null;
  exit: ((event: { exitCode: number }) => void) | null;
}

const spawned: SpawnRecord[] = [];

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true, isPackaged: false },
  safeStorage: {
    isEncryptionAvailable: () => keystore,
    encryptString: (text: string) => Buffer.from(`${MARKER}${text}`, 'utf8'),
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

vi.mock('node-pty', () => ({
  spawn: (file: string, args: string[]) => {
    const record: SpawnRecord = {
      file,
      args,
      written: [],
      killed: false,
      data: null,
      exit: null
    };
    spawned.push(record);
    return {
      pid: 424242,
      onData: (cb: (chunk: string) => void) => {
        record.data = cb;
      },
      onExit: (cb: (event: { exitCode: number }) => void) => {
        record.exit = cb;
      },
      write: (data: string) => {
        record.written.push(data);
      },
      kill: () => {
        record.killed = true;
      }
    };
  }
}));

/**
 * PHASE 72. The tombstone module, replaced.
 *
 * The real one opens the manifest and reaches the machine feed, and neither
 * belongs in a test about which channels are registered and in what order they
 * do their work. What this file has to prove about it is the ORDER: the
 * tombstones are written while the machine row is still in the file, because
 * the label they carry comes from that row. So the stand in records whether
 * the row was still there when it was called.
 *
 * `src/main/machines/__tests__/tombstone.test.ts` holds the module's own
 * behaviour.
 */
const tomb = vi.hoisted(() => ({
  /** Each call, with whether the machine row was still in the file. */
  calls: [] as { id: string; rowStillThere: boolean }[],
  /** How many sessions the stand in reports for a machine. */
  count: 0,
  /** Set in beforeEach, so the stand in can read the real store. */
  rowStillThere: (): boolean => false
}));

vi.mock('../tombstone', () => ({
  forgetMachineSessions: (id: string) => {
    tomb.calls.push({ id, rowStillThere: tomb.rowStillThere() });
    return { tombstoned: tomb.count, commandsSent: 0 as const };
  },
  machineSessionCount: () => tomb.count
}));

const { registerMachinesIpc } = await import('../ipc');
const {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  confirmMachine,
  describeMachine
} = await import('../confirm');
const {
  addMachineRow,
  loadMachines,
  machineFieldsOf,
  machineRow,
  machinesDiskReads,
  machinesPath,
  resetMachinesStoreForTests
} = await import('../store');
const { machineSshSpawnCount, resetMachineTestForTests } = await import(
  '../connection-test'
);
const { describeKeyInstall } = await import('../key-install');
const { machineKeyPath } = await import('../key-material');
const { ensureConfigDir } = await import('../../config/paths');
const { trustedInvokeEvent } = await import(
  '../../security/__tests__/trusted-test-sender'
);

const POP = {
  id: 'pop-os',
  label: 'Pop OS',
  color: 'cyan' as const,
  host: '127.0.0.1',
  user: 'greg',
  port: 2222,
  remoteTmuxPath: '/usr/bin/tmux'
};

// ---------------------------------------------------------------------------
// A fake IpcMain that lets a test call a handler directly
// ---------------------------------------------------------------------------

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
const handlers = new Map<string, Handler>();

const fakeIpc = {
  handle: (channel: string, fn: Handler) => {
    handlers.set(channel, fn);
  }
} as unknown as IpcMain;

/** What main pushed to the window that started a test. */
const sent: { channel: string; payload: unknown }[] = [];

/**
 * An invoke event from a sender the trust registry accepts, with a `send` that
 * records rather than crossing a process boundary.
 *
 * Since Phase 42 stage 1 the typed wrapper refuses any invoke whose sender is
 * not a window Tortie created, so a test that calls a captured handler has to
 * present a trusted event.
 */
function makeEvent(): IpcMainInvokeEvent {
  const base = trustedInvokeEvent();
  const sender = base.sender as unknown as Record<string, unknown>;
  sender['isDestroyed'] = () => false;
  sender['send'] = (channel: string, payload: unknown) => {
    sent.push({ channel, payload });
  };
  return base;
}

let fakeEvent: IpcMainInvokeEvent;

function call<T>(channel: string, ...args: unknown[]): T {
  const fn = handlers.get(channel);
  if (fn === undefined) throw new Error(`${channel} was never registered`);
  return fn(fakeEvent, ...args) as T;
}

function writeFile(value: unknown): void {
  ensureConfigDir();
  writeFileSync(machinesPath(), JSON.stringify(value, null, 2), 'utf8');
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'tortie-machines-ipc-'));
  mkdirSync(join(userData, 'gmux'), { recursive: true });
  keystore = true;
  spawned.length = 0;
  sent.length = 0;
  handlers.clear();
  tomb.calls.length = 0;
  tomb.count = 0;
  tomb.rowStillThere = () => machineRow('pop-os') !== null;
  resetMachinesStoreForTests();
  resetMachineTestForTests();
  registerMachinesIpc(fakeIpc);
  fakeEvent = makeEvent();
});

afterEach(() => {
  resetMachineTestForTests();
  resetMachinesStoreForTests();
  rmSync(userData, { recursive: true, force: true });
});

describe('every channel is registered, and only the ones listed here', () => {
  // The list below is the assertion. It used to be titled with a count, and
  // Phase 73 took the count out of the title rather than moving it: three
  // builders added channels in one phase and a number in a sentence is a thing
  // that goes stale between two of them. The array is the fact.
  it('registers exactly the machines channels this list names', () => {
    expect([...handlers.keys()].sort()).toEqual([
      // Phase 83's one new channel. It writes the version a person accepted
      // into one row and records the agreement in one call. It contacts no
      // machine and starts nothing.
      'machines:acceptVersion',
      'machines:add',
      // ---- PHASE 90.2 ----
      // The SECOND write this product can make on another computer, and the
      // only one this phase adds. It copies one project into one folder that
      // is not there yet, after main has re-read the address from the project
      // folder on this Mac and refused when it did not equal the one the sheet
      // drew. Nothing is written into the session list until the machine says
      // the folder is there.
      'machines:cloneProject',
      // ---- END PHASE 90.2 ----
      'machines:confirm',
      // ---- PHASE 90.2 ----
      // One READ. It reads this project's git remote here, then asks one
      // machine once for every git folder under that machine's own home
      // directory. It writes nothing on either computer, and a project with no
      // git remote contacts the machine zero times.
      'machines:findProject',
      // ---- END PHASE 90.2 ----
      'machines:forget',
      // Phase 79.1's one new channel. It makes a key on this Mac and adds one
      // line to one file on one machine, and it checks the hash of what the
      // person read before it starts anything at all.
      'machines:installKey',
      // ---- PHASE 84 ----
      // One READ of the folders inside one folder on one machine, so the create
      // sheet can offer a picker for the other computer. It lists folders and
      // never files, it writes nothing on either computer, and it refuses while
      // Tortie is not connected to the machine.
      'machines:listDir',
      // ---- END PHASE 84 ----
      // ---- PHASE 99 ----
      // One READ of the file NAMES in one folder on one machine, for the Quick
      // Open palette on a tab whose project lives over there. It carries names
      // and never contents, it sends no program, it writes nothing on either
      // computer, and it refuses while Tortie is not connected to the machine.
      // Nothing calls it on a clock.
      'machines:listFiles',
      // ---- END PHASE 99 ----
      // ---- PHASE 90.3 ----
      // One READ of one folder TREE on one machine, for the Explorer of a
      // project that lives over there. It walks to a fixed depth in one call
      // rather than one call per folder, `.git` is pruned on the far side, it
      // carries no file contents, and it refuses while Tortie is not connected
      // to the machine. Nothing calls it on a clock.
      'machines:listTree',
      // ---- END PHASE 90.3 ----
      // Phase 69's one new channel. It starts something on another machine, and
      // it is the only channel in the product that does.
      'machines:prepare',
      // Phase 73's one WRITE, being the image upload. It is listed here by
      // builder C rather than by the builder who added it, because this file
      // belongs to no builder in this phase and the list has to name every
      // channel or it names none.
      'machines:putImage',
      // ---- PHASE 106 ----
      // One READ of which branch is checked out in one folder on one machine,
      // the branch it follows, and how far ahead and how far behind it is. It
      // writes nothing on either computer, it can never change what is checked
      // out over there, and it refuses while Tortie is not connected to the
      // machine. Nothing calls it on a clock, and nothing on this path fetches.
      'machines:readBranch',
      // ---- END PHASE 106 ----
      // ---- PHASE 108 ----
      // One READ of the agent configuration on one machine, being the skills,
      // MCP servers, hooks, plugins and instruction files the agents THERE
      // will load. The reader and every parser run on this Mac; the machine
      // only lists directories and sends file bytes back, so no second
      // precedence table exists anywhere. It writes nothing on either
      // computer, install, enable and pin are not behind it and never will
      // be, and it refuses while Tortie is not connected to the machine.
      // Nothing calls it on a clock.
      'machines:readContext',
      // ---- END PHASE 108 ----
      // ---- PHASE 107 ----
      // One READ of a page of the newest commits in one folder on one machine,
      // with the two anchors the swimlane picture needs and the marks that say
      // which commits are ahead of the followed branch and which are behind it.
      // It writes nothing on either computer, there is no checkout, no branch
      // and no cherry pick behind it, and it refuses while Tortie is not
      // connected to the machine. Main clamps the count to 500, so one answer
      // stays under about 162,000 bytes. Nothing calls it on a clock, nothing on
      // this path fetches, and it does not read the files one commit changed.
      'machines:readHistory',
      // ---- END PHASE 107 ----
      // ---- PHASE 105 ----
      // One READ of the branch checked out in one folder on one machine,
      // followed by one gh read ON THIS MAC. No token, no gh invocation and no
      // GitHub host name crosses the link: four short strings travel back. It
      // writes nothing on either computer and nothing on GitHub, and it refuses
      // while Tortie is not connected to the machine. Nothing calls it on a
      // clock.
      'machines:readRuns',
      // ---- END PHASE 105 ----
      // ---- PHASE 100 ----
      // One READ of the LAST LINES one session on one machine printed, so a
      // person can read back what an agent over there said. The command it
      // sends is `capture-pane`, which is already row 5 of the verb ledger, it
      // writes nothing on either computer, it stores nothing on this Mac, and
      // it refuses while Tortie is not connected to the machine. Nothing calls
      // it on a clock, and it is not a scrollbar.
      'machines:readSessionLines',
      // ---- END PHASE 100 ----
      'machines:reload',
      'machines:remove',
      // ---- PHASE 73 BLOCK C ----
      // Two READS of one folder on one machine. Neither writes anything on
      // either computer, and both refuse while Tortie is not connected to the
      // machine.
      'machines:reviewFile',
      'machines:reviewFiles',
      // ---- END PHASE 73 BLOCK C ----
      'machines:rows',
      // ---- PHASE 98 ----
      // One READ of one folder on one machine, for the Search view of a project
      // that lives over there. It sends no program: the command that crosses is
      // `repo-search` from the frozen catalogue, and that machine's own grep
      // reads its own disk. It writes nothing on either computer and it refuses
      // while Tortie is not connected to the machine. Nothing calls it on a
      // clock.
      'machines:searchContent',
      // ---- END PHASE 98 ----
      // Phase 71's one new channel. It reads memory in main and answers: no
      // machine is asked anything, no file is opened and nothing is started.
      'machines:state',
      'machines:tailscaleNames',
      'machines:test',
      'machines:testCancel',
      'machines:testInput'
    ]);
  });

  it('registers no channel that opens a session', () => {
    for (const channel of handlers.keys()) {
      expect(channel).not.toContain('connect');
      expect(channel).not.toContain('attach');
      expect(channel).not.toContain('create');
    }
  });
});

// ---------------------------------------------------------------------------
// PHASE 100. The last lines of a session on another machine
// ---------------------------------------------------------------------------

describe('machines:readSessionLines', () => {
  it('hands the input to main unchanged and answers rather than throwing', async () => {
    // Nothing in this process holds a row for any session on any machine, so
    // the read refuses with its own mode word and contacts nothing. What this
    // proves is the wiring: the channel exists, the session id crosses it
    // untouched, and the depth arrives at the clamp in ../remote-lines.ts.
    const out = await call<Promise<{
      sessionId: string;
      mode: string;
      asked: number;
      text: string;
      machineId: string | null;
    }>>('machines:readSessionLines', { sessionId: 'nobody-holds-this', lines: 999_999 });
    expect(out.sessionId).toBe('nobody-holds-this');
    expect(out.mode).toBe('noSession');
    expect(out.asked).toBe(25_000);
    expect(out.text).toBe('');
    expect(out.machineId).toBeNull();
  });

  it('starts nothing at all', async () => {
    const before = spawned.length;
    await call<Promise<unknown>>('machines:readSessionLines', {
      sessionId: 'nobody-holds-this',
      lines: 0
    });
    expect(spawned.length).toBe(before);
    expect(machineSshSpawnCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// PHASE 105. The runs for the branch checked out on another machine
// ---------------------------------------------------------------------------

describe('machines:readRuns', () => {
  it('hands the input to main unchanged and answers rather than throwing', async () => {
    // Nothing in this process is connected to any machine, so the read refuses
    // with its own mode word and contacts nothing. What this proves is the
    // wiring: the channel exists, the machine id and the folder cross it
    // untouched, and the row limit arrives at the clamp in ../remote-runs.ts.
    const out = await call<Promise<{
      machineId: string;
      cwd: string;
      mode: string;
      ownerRepo: string | null;
      branch: string | null;
      headSha: string | null;
      limit: number;
      runs: unknown[];
      health: { state: string };
    }>>('machines:readRuns', {
      machineId: 'nobody-is-connected-to-this',
      cwd: '/work/project',
      limit: 999
    });
    expect(out.machineId).toBe('nobody-is-connected-to-this');
    expect(out.cwd).toBe('/work/project');
    expect(out.mode).toBe('notConnected');
    expect(out.ownerRepo).toBeNull();
    expect(out.branch).toBeNull();
    expect(out.headSha).toBeNull();
    expect(out.limit).toBe(50);
    expect(out.runs).toEqual([]);
    expect(out.health).toEqual({ state: 'ready' });
  });

  it('starts nothing at all, on either computer', async () => {
    const before = spawned.length;
    await call<Promise<unknown>>('machines:readRuns', {
      machineId: 'nobody-is-connected-to-this',
      cwd: '/work/project'
    });
    expect(spawned.length).toBe(before);
    expect(machineSshSpawnCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// PHASE 106. The branch checked out on another machine
// ---------------------------------------------------------------------------

describe('machines:readBranch', () => {
  it('hands the input to main unchanged and answers rather than throwing', async () => {
    // Nothing in this process is connected to any machine, so the read refuses
    // with its own mode word and contacts nothing. What this proves is the
    // wiring: the channel exists and the machine id and the folder cross it
    // untouched.
    const out = await call<Promise<{
      machineId: string;
      cwd: string;
      mode: string;
      branch: string | null;
      sha: string | null;
      shortSha: string | null;
      upstream: string | null;
      upstreamGone: boolean;
      ahead: number;
      behind: number;
      trackUnreadable: boolean;
    }>>('machines:readBranch', {
      machineId: 'nobody-is-connected-to-this',
      cwd: '/work/project'
    });
    expect(out.machineId).toBe('nobody-is-connected-to-this');
    expect(out.cwd).toBe('/work/project');
    expect(out.mode).toBe('notConnected');
    expect(out.branch).toBeNull();
    expect(out.sha).toBeNull();
    expect(out.shortSha).toBeNull();
    expect(out.upstream).toBeNull();
    expect(out.upstreamGone).toBe(false);
    expect(out.ahead).toBe(0);
    expect(out.behind).toBe(0);
    expect(out.trackUnreadable).toBe(false);
  });

  it('starts nothing at all, on either computer', async () => {
    const before = spawned.length;
    await call<Promise<unknown>>('machines:readBranch', {
      machineId: 'nobody-is-connected-to-this',
      cwd: '/work/project'
    });
    expect(spawned.length).toBe(before);
    expect(machineSshSpawnCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// PHASE 107. The commit graph of a folder on another machine
// ---------------------------------------------------------------------------

describe('machines:readHistory', () => {
  it('hands the input to main unchanged and answers rather than throwing', async () => {
    // Nothing in this process is connected to any machine, so the read refuses
    // with its own mode word and contacts nothing. What this proves is the
    // wiring: the channel exists and the machine id, the folder and the count
    // cross it untouched.
    const out = await call<Promise<{
      machineId: string;
      cwd: string;
      mode: string;
      entries: unknown[];
      maxCount: number;
      ceiling: number;
      hasMore: boolean;
      atCeiling: boolean;
      headSha: string | null;
      upstreamSha: string | null;
      mergeBase: string | null;
      markedCount: number;
      divergenceTruncated: boolean;
      answerBytes: number;
    }>>('machines:readHistory', {
      machineId: 'nobody-is-connected-to-this',
      cwd: '/work/project'
    });
    expect(out.machineId).toBe('nobody-is-connected-to-this');
    expect(out.cwd).toBe('/work/project');
    expect(out.mode).toBe('notConnected');
    expect(out.entries).toEqual([]);
    expect(out.maxCount).toBe(50);
    expect(out.ceiling).toBe(500);
    expect(out.hasMore).toBe(false);
    expect(out.atCeiling).toBe(false);
    expect(out.headSha).toBeNull();
    expect(out.upstreamSha).toBeNull();
    expect(out.mergeBase).toBeNull();
    expect(out.markedCount).toBe(0);
    expect(out.divergenceTruncated).toBe(false);
    expect(out.answerBytes).toBe(0);
  });

  it('clamps the count in main, so a renderer cannot ask for 20,000', async () => {
    // THIS IS WHAT KEEPS THE PHASE AT TIER 2. 20,000 commits would be about
    // 5,400,000 base64 bytes in one answer that main buffers whole.
    const out = await call<Promise<{ maxCount: number; ceiling: number }>>(
      'machines:readHistory',
      {
        machineId: 'nobody-is-connected-to-this',
        cwd: '/work/project',
        maxCount: 20_000
      }
    );
    expect(out.maxCount).toBe(500);
    expect(out.ceiling).toBe(500);
  });

  it('starts nothing at all, on either computer', async () => {
    const before = spawned.length;
    await call<Promise<unknown>>('machines:readHistory', {
      machineId: 'nobody-is-connected-to-this',
      cwd: '/work/project'
    });
    expect(spawned.length).toBe(before);
    expect(machineSshSpawnCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// PHASE 108. The Context of a folder on another machine
// ---------------------------------------------------------------------------

describe('machines:readContext', () => {
  it('hands the input to main unchanged and answers rather than throwing', async () => {
    // Nothing in this process is connected to any machine, so the read
    // refuses with its own mode word and contacts nothing. What this proves
    // is the wiring: the channel exists and the machine id and the folder
    // cross it untouched.
    const out = await call<Promise<{
      machineId: string;
      cwd: string;
      mode: string;
      scan: unknown;
      passes: number;
      calls: number;
      cut: boolean;
    }>>('machines:readContext', {
      machineId: 'nobody-is-connected-to-this',
      cwd: '/work/project'
    });
    expect(out.machineId).toBe('nobody-is-connected-to-this');
    expect(out.cwd).toBe('/work/project');
    expect(out.mode).toBe('notConnected');
    expect(out.scan).toBeNull();
    expect(out.passes).toBe(0);
    expect(out.calls).toBe(0);
    expect(out.cut).toBe(false);
  });

  it('starts nothing at all, on either computer', async () => {
    const before = spawned.length;
    await call<Promise<unknown>>('machines:readContext', {
      machineId: 'nobody-is-connected-to-this',
      cwd: '/work/project'
    });
    expect(spawned.length).toBe(before);
    expect(machineSshSpawnCount()).toBe(0);
  });
});

describe('machines:rows', () => {
  it('opens no file', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const before = machinesDiskReads();
    call('machines:rows');
    call('machines:rows');
    expect(machinesDiskReads()).toBe(before);
  });

  it('carries the honesty line and the warning from main', () => {
    loadMachines('boot');
    const out = call<{ honesty: string; warning: string }>('machines:rows');
    expect(out.honesty).toContain('It can never seal');
    expect(out.warning).toContain('sign in to as you');
  });

  it('reports a machine nobody confirmed as not usable, with its sentence', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const out = call<{ rows: { state: string; usable: boolean; refusal: string | null }[] }>(
      'machines:rows'
    );
    expect(out.rows[0]?.state).toBe('never');
    expect(out.rows[0]?.usable).toBe(false);
    expect(out.rows[0]?.refusal).toContain('nobody has confirmed it');
  });

  it('names the field and the reason for a row it dropped', () => {
    writeFile({
      schema: 1,
      machines: [POP, { id: 'broken', host: '-oProxyCommand=x' }]
    });
    loadMachines('boot');
    const out = call<{ errors: { field: string; reason: string }[] }>('machines:rows');
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0]?.field).toContain('host');
    expect(out.errors[0]?.reason).toContain('hyphen');
  });
});

describe('machines:test in saved mode', () => {
  it('refuses a machine nobody confirmed BEFORE it spawns anything', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    expect(() => call('machines:test', { mode: 'saved', id: 'pop-os' })).toThrow(
      /nobody has confirmed it/
    );
    expect(spawned).toHaveLength(0);
    expect(machineSshSpawnCount()).toBe(0);
  });

  it('refuses a machine whose details changed, before it spawns anything', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const sheet = describeMachine('pop-os', machineFieldsOf(POP));
    confirmMachine('pop-os', machineFieldsOf(POP), {
      acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
      hashRead: sheet.hash,
      linesRead: sheet.lines
    });
    writeFile({ schema: 1, machines: [{ ...POP, host: '127.0.0.2' }] });
    loadMachines('reload');
    expect(() => call('machines:test', { mode: 'saved', id: 'pop-os' })).toThrow(
      /details changed/
    );
    expect(spawned).toHaveLength(0);
  });

  it('refuses an id no row carries', () => {
    loadMachines('boot');
    expect(() => call('machines:test', { mode: 'saved', id: 'nope' })).toThrow(
      /no machine called nope/
    );
    expect(spawned).toHaveLength(0);
  });

  it('starts one client for a machine a person confirmed', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const sheet = describeMachine('pop-os', machineFieldsOf(POP));
    confirmMachine('pop-os', machineFieldsOf(POP), {
      acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
      hashRead: sheet.hash,
      linesRead: sheet.lines
    });
    const started = call<{ testId: string; commandLine: string }>('machines:test', {
      mode: 'saved',
      id: 'pop-os'
    });
    expect(started.testId.length).toBeGreaterThan(10);
    expect(spawned).toHaveLength(1);
    expect(spawned[0]?.args).toContain('BatchMode=no');
    expect(started.commandLine).toContain('BatchMode=no');
  });
});

describe('machines:test in draft mode', () => {
  it('does not ask the gate, because there is nothing to have confirmed', () => {
    loadMachines('boot');
    const started = call<{ testId: string }>('machines:test', {
      mode: 'draft',
      draft: { host: '127.0.0.1', user: null, port: 2222, remoteTmuxPath: null }
    });
    expect(started.testId.length).toBeGreaterThan(10);
    expect(spawned).toHaveLength(1);
  });

  it('still refuses a typed address the file would refuse', () => {
    loadMachines('boot');
    expect(() =>
      call('machines:test', {
        mode: 'draft',
        draft: {
          host: '-oProxyCommand=x',
          user: null,
          port: null,
          remoteTmuxPath: null
        }
      })
    ).toThrow(/hyphen/);
    expect(spawned).toHaveLength(0);
  });

  it('cancels the first test when a second one starts', () => {
    loadMachines('boot');
    const draft = {
      mode: 'draft' as const,
      draft: { host: '127.0.0.1', user: null, port: null, remoteTmuxPath: null }
    };
    const first = call<{ testId: string }>('machines:test', draft);
    call<{ testId: string }>('machines:test', draft);
    const ends = sent.filter(
      (row) => (row.payload as { kind: string }).kind === 'end'
    );
    expect(ends).toHaveLength(1);
    const ended = ends[0]?.payload as {
      testId: string;
      outcome: { class: string; alarm: boolean };
    };
    expect(ended.testId).toBe(first.testId);
    expect(ended.outcome.class).toBe('cancelled');
    expect(ended.outcome.alarm).toBe(false);
  });
});

describe('the confirm sheet a draft test hands back', () => {
  /** Drive one draft test to its end event, and return the outcome. */
  function runDraft(draft: Record<string, unknown>): {
    class: string;
    sheet: { hash: string; lines: string[]; warning: string } | null | undefined;
    resolvedPath: string | null;
  } {
    const started = call<{ testId: string }>('machines:test', { mode: 'draft', draft });
    // The fake pty never speaks, so the test is ended the way a person's Cancel
    // ends it, and then again as if the machine had answered. The first branch
    // proves a failed test carries no sheet.
    call('machines:testCancel', started.testId);
    const end = sent
      .map((row) => row.payload as { kind: string; outcome?: unknown })
      .filter((payload) => payload.kind === 'end')
      .pop();
    return (end?.outcome ?? {}) as {
      class: string;
      sheet: { hash: string; lines: string[]; warning: string } | null | undefined;
      resolvedPath: string | null;
    };
  }

  it('carries no sheet when the test did not succeed', () => {
    loadMachines('boot');
    const outcome = runDraft({
      id: 'probe',
      host: '127.0.0.1',
      user: null,
      port: null,
      remoteTmuxPath: null
    });
    expect(outcome.class).toBe('cancelled');
    expect(outcome.sheet ?? null).toBeNull();
  });

  it('carries no sheet when the person has not named the machine', () => {
    loadMachines('boot');
    const outcome = runDraft({
      host: '127.0.0.1',
      user: null,
      port: null,
      remoteTmuxPath: null
    });
    expect(outcome.sheet ?? null).toBeNull();
  });
});

describe('the key block a refused test hands back (Phase 79.1)', () => {
  /**
   * Drive one draft test to its end by making the stand in print what a real
   * program prints and then exit.
   *
   * Nothing connects to anything. The bytes below are the ones a real client
   * writes, and they are the same fixtures `__tests__/errors.test.ts` uses.
   */
  function runDraftTo(
    draft: Record<string, unknown>,
    output: string,
    exitCode: number
  ): {
    class: string;
    keySheet:
      | { hash: string; lines: string[]; warning: string; notes: string[] }
      | null
      | undefined;
  } {
    call<{ testId: string }>('machines:test', { mode: 'draft', draft });
    const record = spawned[spawned.length - 1];
    record?.data?.(output);
    record?.exit?.({ exitCode });
    const end = sent
      .map((row) => row.payload as { kind: string; outcome?: unknown })
      .filter((payload) => payload.kind === 'end')
      .pop();
    return (end?.outcome ?? {}) as {
      class: string;
      keySheet:
        | { hash: string; lines: string[]; warning: string; notes: string[] }
        | null
        | undefined;
    };
  }

  const DRAFT = {
    id: 'pop-os',
    host: '127.0.0.1',
    user: 'greg',
    port: 2222,
    remoteTmuxPath: null
  };

  it('offers the block when the machine refused the sign in', () => {
    loadMachines('boot');
    const outcome = runDraftTo(
      DRAFT,
      'greg@127.0.0.1: Permission denied (publickey).\n',
      255
    );
    expect(outcome.class).toBe('auth-refused');
    const block = outcome.keySheet ?? null;
    expect(block).not.toBeNull();
    expect(block?.lines).toEqual([
      'Machine: 127.0.0.1',
      'Signs in as: greg',
      'Port: 2222',
      'Writes this file on that machine: ~/.ssh/authorized_keys',
      expect.stringContaining('Keeps the private half of the key on this Mac, at: ')
    ]);
    expect(block?.hash.length).toBe(64);
    expect(block?.notes).toHaveLength(5);
    expect(block?.warning).toContain('private half stays on this Mac');
  });

  it('offers it for a machine that answered and declined the connection', () => {
    // This is what Remote Login being switched off looks like, which is the
    // case the operator hit on his own machine.
    loadMachines('boot');
    const outcome = runDraftTo(
      DRAFT,
      'ssh: connect to host 127.0.0.1 port 2222: Connection refused\n',
      255
    );
    expect(outcome.class).toBe('refused');
    expect(outcome.keySheet ?? null).not.toBeNull();
  });

  it('offers nothing for an answer a key would not help', () => {
    loadMachines('boot');
    const outcome = runDraftTo(
      DRAFT,
      'ssh: connect to host 127.0.0.1 port 2222: No route to host\n',
      255
    );
    expect(outcome.class).toBe('unreachable');
    expect(outcome.keySheet ?? null).toBeNull();
  });

  it('offers nothing when the person has not named the machine', () => {
    // The name is on the hash, so there is nothing to agree to without one.
    loadMachines('boot');
    const outcome = runDraftTo(
      { host: '127.0.0.1', user: null, port: null, remoteTmuxPath: null },
      'greg@127.0.0.1: Permission denied (publickey).\n',
      255
    );
    expect(outcome.class).toBe('auth-refused');
    expect(outcome.keySheet ?? null).toBeNull();
  });

  it('makes no key while composing the block', () => {
    // The block names the file the key WOULD be kept in. Nothing is made until
    // a person presses the button and the hash they read matches.
    loadMachines('boot');
    const outcome = runDraftTo(
      DRAFT,
      'greg@127.0.0.1: Permission denied (publickey).\n',
      255
    );
    const at = (outcome.keySheet?.lines ?? []).find((line) =>
      line.startsWith('Keeps the private half')
    );
    const path = (at ?? '').split(': ')[1] ?? '';
    expect(path.startsWith(join(userData, 'gmux', 'machines', 'keys'))).toBe(true);
    expect(existsSync(path)).toBe(false);
    expect(existsSync(join(userData, 'gmux', 'machines', 'keys'))).toBe(false);
  });
});

describe('machines:installKey (Phase 79.1)', () => {
  const BLOCK_FOR = (
    id: string,
    fields: { host: string; user: string | null; port: number | null }
  ): { hash: string; lines: string[] } => {
    const block = describeKeyInstall(id, {
      ...fields,
      localKeyPath: machineKeyPath(id)
    });
    return { hash: block.hash, lines: [...block.lines] };
  };

  it('refuses a machine with no name, and starts nothing', async () => {
    loadMachines('boot');
    await expect(
      call<Promise<unknown>>('machines:installKey', {
        target: {
          mode: 'draft',
          draft: { host: '127.0.0.1', user: null, port: null, remoteTmuxPath: null }
        },
        hashRead: 'x',
        linesRead: [],
        password: 'hunter2'
      })
    ).rejects.toThrow(/Name this machine/);
    expect(spawned).toHaveLength(0);
    expect(machineSshSpawnCount()).toBe(0);
    expect(existsSync(join(userData, 'gmux', 'machines', 'keys'))).toBe(false);
  });

  it('refuses a hash that is not the one main would compute now', async () => {
    loadMachines('boot');
    await expect(
      call<Promise<unknown>>('machines:installKey', {
        target: {
          mode: 'draft',
          draft: {
            id: 'pop-os',
            host: '127.0.0.1',
            user: null,
            port: null,
            remoteTmuxPath: null
          }
        },
        hashRead: 'a'.repeat(64),
        linesRead: [],
        password: 'hunter2'
      })
    ).rejects.toThrow(/machine changed after it was shown/);
    // Nothing was made and nothing was sent. This is the sentence the whole
    // channel rests on.
    expect(spawned).toHaveLength(0);
    expect(machineSshSpawnCount()).toBe(0);
    expect(existsSync(join(userData, 'gmux', 'machines', 'keys'))).toBe(false);
  });

  it('refuses lines that are not the ones main composed', async () => {
    loadMachines('boot');
    const block = BLOCK_FOR('pop-os', { host: '127.0.0.1', user: null, port: null });
    await expect(
      call<Promise<unknown>>('machines:installKey', {
        target: {
          mode: 'draft',
          draft: {
            id: 'pop-os',
            host: '127.0.0.1',
            user: null,
            port: null,
            remoteTmuxPath: null
          }
        },
        hashRead: block.hash,
        linesRead: [...block.lines, 'Also writes: /etc/passwd'],
        password: 'hunter2'
      })
    ).rejects.toThrow(/machine changed after it was shown/);
    expect(spawned).toHaveLength(0);
  });

  it('refuses a typed address the machines file would refuse', async () => {
    loadMachines('boot');
    await expect(
      call<Promise<unknown>>('machines:installKey', {
        target: {
          mode: 'draft',
          draft: {
            id: 'pop-os',
            host: '-oProxyCommand=x',
            user: null,
            port: null,
            remoteTmuxPath: null
          }
        },
        hashRead: 'a'.repeat(64),
        linesRead: [],
        password: 'hunter2'
      })
    ).rejects.toThrow(/hyphen/);
    expect(spawned).toHaveLength(0);
  });

  it('refuses an id no row carries, in saved mode', async () => {
    loadMachines('boot');
    await expect(
      call<Promise<unknown>>('machines:installKey', {
        target: { mode: 'saved', id: 'nope' },
        hashRead: 'a'.repeat(64),
        linesRead: [],
        password: 'hunter2'
      })
    ).rejects.toThrow(/no machine called nope/);
    expect(spawned).toHaveLength(0);
  });

  it('does NOT ask the confirm gate for a saved row, and says why in code', async () => {
    // A machine that has never let Tortie in has no program path, so it cannot
    // be confirmed. Asking the gate here would make this channel unreachable
    // for exactly the person it is for. What stands in its place is this
    // call's own hash, which is checked next and refuses the one below.
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    await expect(
      call<Promise<unknown>>('machines:installKey', {
        target: { mode: 'saved', id: 'pop-os' },
        hashRead: 'a'.repeat(64),
        linesRead: [],
        password: 'hunter2'
      })
    ).rejects.toThrow(/machine changed after it was shown/);
    expect(spawned).toHaveLength(0);
  });
});

describe('machines:add', () => {
  const sheetFor = (row: typeof POP): { hash: string; lines: string[] } => {
    const summary = describeMachine(row.id, machineFieldsOf(row));
    return { hash: summary.hash, lines: [...summary.lines] };
  };

  it('writes the row and records the confirmation in one call', () => {
    loadMachines('boot');
    const sheet = sheetFor(POP);
    const view = call<{ state: string; usable: boolean }>('machines:add', {
      ...POP,
      hashRead: sheet.hash,
      linesRead: sheet.lines
    });
    expect(view.state).toBe('confirmed');
    expect(view.usable).toBe(true);
    expect(loadMachines('reload').rows.map((r) => r.id)).toEqual(['pop-os']);
  });

  it('spawns nothing', () => {
    loadMachines('boot');
    const sheet = sheetFor(POP);
    call('machines:add', { ...POP, hashRead: sheet.hash, linesRead: sheet.lines });
    expect(spawned).toHaveLength(0);
    expect(machineSshSpawnCount()).toBe(0);
  });

  it('refuses a stale hash and writes NOTHING', () => {
    loadMachines('boot');
    expect(() =>
      call('machines:add', {
        ...POP,
        hashRead: 'a hash from an older sheet',
        linesRead: []
      })
    ).toThrow(/changed after it/);
    expect(loadMachines('reload').rows).toEqual([]);
  });

  it('refuses a second machine with the same id', () => {
    loadMachines('boot');
    const sheet = sheetFor(POP);
    call('machines:add', { ...POP, hashRead: sheet.hash, linesRead: sheet.lines });
    expect(() =>
      call('machines:add', { ...POP, hashRead: sheet.hash, linesRead: sheet.lines })
    ).toThrow(/already a machine called pop-os/);
  });

  it('refuses a row the schema would drop, naming the field', () => {
    loadMachines('boot');
    const bad = { ...POP, host: '-oProxyCommand=x' };
    const sheet = sheetFor(bad);
    expect(() =>
      call('machines:add', { ...bad, hashRead: sheet.hash, linesRead: sheet.lines })
    ).toThrow(/hyphen/);
    expect(loadMachines('reload').rows).toEqual([]);
  });

  it('keeps the row when the keychain refuses to seal, and says so', () => {
    loadMachines('boot');
    const sheet = sheetFor(POP);
    keystore = false;
    expect(() =>
      call('machines:add', { ...POP, hashRead: sheet.hash, linesRead: sheet.lines })
    ).toThrow(/system keychain is unavailable/);
    // The machine a person just made is still there. It is not usable, which is
    // honest, and it was not deleted because of a keychain hiccup.
    expect(loadMachines('reload').rows.map((r) => r.id)).toEqual(['pop-os']);
  });
});

describe('machines:confirm, forget and remove', () => {
  it('confirms an existing row from the sheet it was drawn from', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const summary = describeMachine('pop-os', machineFieldsOf(POP));
    const view = call<{ state: string }>('machines:confirm', {
      id: 'pop-os',
      hashRead: summary.hash,
      linesRead: [...summary.lines]
    });
    expect(view.state).toBe('confirmed');
    expect(spawned).toHaveLength(0);
  });

  it('withdraws an agreement so the machine asks again', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const summary = describeMachine('pop-os', machineFieldsOf(POP));
    call('machines:confirm', {
      id: 'pop-os',
      hashRead: summary.hash,
      linesRead: [...summary.lines]
    });
    const view = call<{ state: string; usable: boolean }>('machines:forget', 'pop-os');
    expect(view.state).toBe('never');
    expect(view.usable).toBe(false);
  });

  it('removes the row and its record together', () => {
    loadMachines('boot');
    addMachineRow(POP);
    const summary = describeMachine('pop-os', machineFieldsOf(POP));
    call('machines:confirm', {
      id: 'pop-os',
      hashRead: summary.hash,
      linesRead: [...summary.lines]
    });
    const out = call<{ rows: unknown[] }>('machines:remove', 'pop-os');
    expect(out.rows).toEqual([]);
    // Putting the same machine back leaves it unconfirmed, because the record
    // went with the row.
    addMachineRow(POP);
    const after = call<{ rows: { state: string }[] }>('machines:rows');
    expect(after.rows[0]?.state).toBe('never');
  });
});

// ---------------------------------------------------------------------------
// PHASE 83. Accepting the version one machine reports
// ---------------------------------------------------------------------------

describe('machines:acceptVersion', () => {
  /** The sheet main would draw for accepting one version on this row. */
  function sheetFor(version: string): { hash: string; lines: string[] } {
    const summary = describeMachine('pop-os', {
      ...machineFieldsOf(POP),
      acceptedTmuxVersion: version
    });
    return { hash: summary.hash, lines: [...summary.lines] };
  }

  beforeEach(() => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
  });

  it('writes the version and records the agreement in one call', () => {
    const sheet = sheetFor('3.9a');
    const view = call<{ state: string; usable: boolean; acceptedTmuxVersion: string | null }>(
      'machines:acceptVersion',
      { id: 'pop-os', version: '3.9a', hashRead: sheet.hash, linesRead: sheet.lines }
    );
    expect(view.acceptedTmuxVersion).toBe('3.9a');
    expect(view.state).toBe('confirmed');
    expect(view.usable).toBe(true);
    expect(machineRow('pop-os')?.acceptedTmuxVersion).toBe('3.9a');
    expect(spawned).toHaveLength(0);
    expect(machineSshSpawnCount()).toBe(0);
  });

  it('refuses a stale sheet and writes NOTHING', () => {
    const stale = describeMachine('pop-os', machineFieldsOf(POP));
    expect(() =>
      call('machines:acceptVersion', {
        id: 'pop-os',
        version: '3.9a',
        hashRead: stale.hash,
        linesRead: [...stale.lines]
      })
    ).toThrow(/changed after it was shown/);
    expect(machineRow('pop-os')?.acceptedTmuxVersion).toBeUndefined();
    expect(spawned).toHaveLength(0);
  });

  it('refuses a value that is not a version, before anything is written', () => {
    expect(() =>
      call('machines:acceptVersion', {
        id: 'pop-os',
        version: '3.7c; rm -rf /',
        hashRead: 'whatever',
        linesRead: []
      })
    ).toThrow(/not a version Tortie can read/);
    expect(machineRow('pop-os')?.acceptedTmuxVersion).toBeUndefined();
  });

  it('refuses a machine that is not in the file', () => {
    expect(() =>
      call('machines:acceptVersion', {
        id: 'nowhere',
        version: '3.9a',
        hashRead: 'whatever',
        linesRead: []
      })
    ).toThrow(/There is no machine called nowhere/);
  });

  it('writes the accepted version into the sheet the row draws', () => {
    const sheet = sheetFor('3.9a');
    call('machines:acceptVersion', {
      id: 'pop-os',
      version: '3.9a',
      hashRead: sheet.hash,
      linesRead: sheet.lines
    });
    const out = call<{ rows: { lines: string[] }[] }>('machines:rows');
    expect(out.rows[0]?.lines.join('\n')).toContain(
      'Accepts this version of the program, which Tortie has not measured: 3.9a'
    );
  });

  it('takes the accepted version away when the agreement is withdrawn', () => {
    const sheet = sheetFor('3.9a');
    call('machines:acceptVersion', {
      id: 'pop-os',
      version: '3.9a',
      hashRead: sheet.hash,
      linesRead: sheet.lines
    });
    const view = call<{ state: string; acceptedTmuxVersion: string | null }>(
      'machines:forget',
      'pop-os'
    );
    expect(view.acceptedTmuxVersion).toBeNull();
    expect(view.state).toBe('never');
    expect(machineRow('pop-os')?.acceptedTmuxVersion).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PHASE 72. What a removal leaves behind
// ---------------------------------------------------------------------------

describe('machines:remove writes the record before the row goes', () => {
  it('tombstones the sessions while the machine is still in the file', () => {
    loadMachines('boot');
    addMachineRow(POP);
    tomb.count = 2;
    call('machines:remove', 'pop-os');
    // One call, for this machine, made while the row was still there. The
    // label the record carries comes from that row, so a removal that deleted
    // it first would write the id where a person expects the name.
    expect(tomb.calls).toEqual([{ id: 'pop-os', rowStillThere: true }]);
    expect(machineRow('pop-os')).toBeNull();
  });

  it('still asks even when Tortie holds no session for the machine', () => {
    loadMachines('boot');
    addMachineRow(POP);
    tomb.count = 0;
    call('machines:remove', 'pop-os');
    // The link is closed and the feed rows are dropped by the same call, so it
    // runs for a machine with nothing on it too.
    expect(tomb.calls).toHaveLength(1);
  });

  it('spawns nothing, because nothing is sent to the machine', () => {
    loadMachines('boot');
    addMachineRow(POP);
    tomb.count = 3;
    call('machines:remove', 'pop-os');
    expect(spawned).toHaveLength(0);
    expect(machineSshSpawnCount()).toBe(0);
  });
});

describe('machines:rows carries the session count', () => {
  it('names a number, so the removal question can count out loud', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    tomb.count = 2;
    const out = call<{ rows: { sessions: number }[] }>('machines:rows');
    expect(out.rows[0]?.sessions).toBe(2);
  });

  it('reads 0 for a machine Tortie holds nothing for', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const out = call<{ rows: { sessions: number }[] }>('machines:rows');
    expect(out.rows[0]?.sessions).toBe(0);
  });
});
