/**
 * Phase 323. What End ends after the hang-up, one rule per case
 * (build/p323/SPEC.md §5.1).
 *
 * Nothing here reads the live process table or signals a real process. Every
 * table is planted, the clock and the waits are a fake, and `kill` is a
 * recorder that asserts every pid it is handed is above 1 and is not this
 * test's own. The one module the real reader goes through, `../guarded`, is
 * replaced by a recorder too, so the C locale rule is asserted on the argv and
 * the environment the reader would have spawned, and no `ps` is run.
 *
 * The planted rows are the census's shapes (SPEC §3): created (the agent is
 * the pane process), restored (a login shell is, and the agent is its
 * foreground job) and wrapped (`specstory run` is), plus the processes the
 * rule must never touch: a `setsid` child, a person's background job, Codex's
 * shared background server and an application bundle's executable.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuardedRunOptions, GuardedRunResult } from '../guarded';

/** Every run the real reader asked for, and what the next one answers. */
const guarded = vi.hoisted(() => ({
  calls: [] as Array<{ bin: string; args: string[]; options: GuardedRunOptions }>,
  next: null as Partial<GuardedRunResult> | null,
  /** When set, answers each run instead of `next`, from its argv. */
  answer: null as ((args: readonly string[]) => Partial<GuardedRunResult>) | null
}));

vi.mock('../guarded', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../guarded')>();
  return {
    ...actual,
    runGuarded: (
      bin: string,
      args: readonly string[],
      options: GuardedRunOptions
    ): Promise<GuardedRunResult> => {
      guarded.calls.push({ bin, args: [...args], options });
      return Promise.resolve({
        stdout: '',
        stderr: '',
        code: 0,
        signal: null,
        timedOut: false,
        cancelled: false,
        spawnError: null,
        ...(guarded.answer !== null ? guarded.answer(args) : (guarded.next ?? {}))
      });
    }
  };
});

const {
  ALL_PANES_ARGV,
  ENDING_WORST_MS,
  HANGUP_GRACE_MS,
  LIVE_PANES_ARGV,
  PANE_ROOT_FORMAT,
  POLL_MS,
  QUICK_POLLS_MS,
  READ_RETRY_MS,
  REREAD_ONE_BY_ONE_MAX,
  TERM_GRACE_MS,
  TREE_PS_ARGS,
  TREE_READ_TIMEOUT_MS,
  basenameOf,
  defaultEndDeps,
  endHangupSurvivors,
  hungUpOnly,
  identityPsArgs,
  livePanesVia,
  parsePaneRoots,
  parsePanePids,
  parseTreeTable,
  readSessionTree,
  sessionPanesArgv,
  stillTheSame,
  terminalPsArgs
} = await import('../session-tree');
import type {
  EndDeps,
  SessionTree,
  TreeEntry,
  TreeRow
} from '../session-tree';

// ---------------------------------------------------------------------------
// Planting
// ---------------------------------------------------------------------------

const SERVER = 611;
const SELF = 4242;
const STARTED = 'Tue Sep 29 17:41:36 2026';

function row(
  pid: number,
  ppid: number,
  pgid: number,
  tpgid: number,
  stat: string,
  command: string,
  lstart: string = STARTED
): TreeRow {
  return { pid, ppid, pgid, tpgid, stat, lstart, command };
}

function tableOf(...rows: TreeRow[]): Map<number, TreeRow> {
  const t = new Map<number, TreeRow>();
  // The tmux server and launchd are in every real table.
  t.set(1, row(1, 0, 1, 0, 'Ss', '/sbin/launchd'));
  t.set(SERVER, row(SERVER, 1, SERVER, 0, 'Ss', 'tmux -L gmux-p323 new-session'));
  for (const r of rows) t.set(r.pid, r);
  return t;
}

const TTY = '/dev/ttys012';
const ROOT = { pid: 812, serverPid: SERVER, tty: TTY };

/** A pane check that shows no pane: the hang-up closed every one. */
const NO_PANE_SHOWN = (): Promise<ReadonlySet<number>> => Promise.resolve(new Set<number>());

function pidsIn(entries: readonly TreeEntry[]): number[] {
  return entries.map((e) => e.pid).sort((a, b) => a - b);
}

function entry(r: TreeRow): TreeEntry {
  return { pid: r.pid, pgid: r.pgid, lstart: r.lstart, command: r.command };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

describe('parseTreeTable', () => {
  it('reads the C locale form, a space padded day and a command with spaces', () => {
    const rows = parseTreeTable(
      [
        '  812   611   812   812 Ss+  Tue Sep 29 17:41:36 2026     node /opt/homebrew/bin/gemini --yolo --skip-trust',
        '  813   812   812   812 S+   Sun Sep  6 09:03:04 2026     /usr/bin/perl -e select(undef,undef,undef,90)',
        '  205 33332   205    0 Rs   Tue Sep 29 14:33:54 2026     postgres: gdc db 127.0.0.1(63958) SELECT        '
      ].join('\n')
    );
    expect(rows.get(812)).toEqual(
      row(812, 611, 812, 812, 'Ss+', 'node /opt/homebrew/bin/gemini --yolo --skip-trust')
    );
    // The padded day collapses to one space, so two reads of one process agree
    // however `ps` padded it.
    expect(rows.get(813)?.lstart).toBe('Sun Sep 6 09:03:04 2026');
    expect(rows.get(813)?.command).toBe(
      '/usr/bin/perl -e select(undef,undef,undef,90)'
    );
    expect(rows.get(205)?.command).toBe('postgres: gdc db 127.0.0.1(63958) SELECT');
  });

  it('reads tpgid 0 for a process with no terminal', () => {
    const rows = parseTreeTable(
      '78444     1 78444    0 Ss   Mon Sep 28 23:10:56 2026     codex app-server daemon pid-update-loop'
    );
    expect(rows.get(78444)?.tpgid).toBe(0);
    expect(rows.get(78444)?.ppid).toBe(1);
  });

  it('parses a line taken under another locale to nothing', () => {
    // The same process as the first row above, read under fr_FR.UTF-8
    // (measured by the spec step, SPEC §1.2).
    expect(
      parseTreeTable(
        '  812   611   812   812 Ss+  Mar 29 sep 17:41:36 2026     node gemini'
      ).size
    ).toBe(0);
  });

  it('drops a pid that appears twice, because it has no single identity', () => {
    const rows = parseTreeTable(
      [
        '  900   812   812   812 S+   Tue Sep 29 17:41:36 2026     sleep 600',
        '  900   812   812   812 S+   Tue Sep 29 17:41:37 2026     sleep 600',
        '  901   812   812   812 S+   Tue Sep 29 17:41:36 2026     sleep 60'
      ].join('\n')
    );
    expect([...rows.keys()]).toEqual([901]);
  });
});

describe('the C locale, on every read', () => {
  beforeEach(() => {
    guarded.calls = [];
    guarded.next = null;
    guarded.answer = null;
  });

  it('runs /bin/ps with LC_ALL=C and -ww for the wide read, so a fr_FR start time is never read', async () => {
    guarded.next = {
      stdout:
        '  812   611   812   812 Ss+  Tue Sep 29 17:41:36 2026     node gemini\n'
    };
    const table = await defaultEndDeps(NO_PANE_SHOWN).readTable();
    expect(table?.get(812)?.command).toBe('node gemini');
    expect(guarded.calls).toHaveLength(1);
    const [call] = guarded.calls;
    expect(call?.bin).toBe('/bin/ps');
    expect(call?.args).toEqual([...TREE_PS_ARGS]);
    expect(call?.args).toContain('-ww');
    expect(call?.options.env?.['LC_ALL']).toBe('C');
    expect(call?.options.timeoutMs).toBe(TREE_READ_TIMEOUT_MS);
  });

  it('runs /bin/ps with LC_ALL=C and -ww for the identity re-read, so a fr_FR start time is never read', async () => {
    await defaultEndDeps(NO_PANE_SHOWN).reread([812]);
    const [call] = guarded.calls;
    expect(call?.args).toEqual(identityPsArgs(812));
    expect(call?.args).toEqual([
      '-ww',
      '-o',
      'pid=,ppid=,pgid=,tpgid=,stat=,lstart=,command=',
      '-p',
      '812'
    ]);
    expect(call?.options.env?.['LC_ALL']).toBe('C');
    expect(call?.options.timeoutMs).toBeLessThanOrEqual(TREE_READ_TIMEOUT_MS);
    expect(call?.options.timeoutMs).toBeGreaterThan(0);
  });

  it('runs /bin/ps with LC_ALL=C and -ww for the terminal read End waits for, one terminal per call', async () => {
    guarded.answer = (args) => ({
      stdout:
        args.at(-1) === TTY
          ? '  812   611   812   812 Ss+  Tue Sep 29 17:41:36 2026     node gemini\n'
          : '  900   611   900   900 Ss+  Tue Sep 29 17:41:36 2026     claude\n'
    });
    const table = await defaultEndDeps(NO_PANE_SHOWN).readTerminals([TTY, '/dev/ttys013', TTY]);
    expect([...(table?.keys() ?? [])].sort()).toEqual([812, 900]);
    expect(guarded.calls.map((c) => c.args)).toEqual([
      terminalPsArgs(TTY),
      terminalPsArgs('/dev/ttys013')
    ]);
    expect(terminalPsArgs(TTY)).toEqual([
      '-ww',
      '-o',
      'pid=,ppid=,pgid=,tpgid=,stat=,lstart=,command=',
      '-t',
      TTY
    ]);
    for (const call of guarded.calls) {
      expect(call.bin).toBe('/bin/ps');
      expect(call.options.env?.['LC_ALL']).toBe('C');
      expect(call.options.timeoutMs).toBeLessThanOrEqual(TREE_READ_TIMEOUT_MS);
    }
  });

  it('refuses a terminal that is not a terminal path, and a terminal ps cannot find', async () => {
    expect(await defaultEndDeps(NO_PANE_SHOWN).readTerminals(['ttys012; rm -rf /'])).toBeNull();
    expect(guarded.calls).toHaveLength(0);
    guarded.next = { code: 1, stderr: 'ps: /dev/ttys999: No such file or directory' };
    expect(await defaultEndDeps(NO_PANE_SHOWN).readTerminals(['/dev/ttys999'])).toBeNull();
  });

  it('asks ps for ONE pid per call, because `ps -p a,b` costs about 200 ms and such calls queue', async () => {
    // The fix round's verifier: two pids in one call took 200 to 1,300 ms of
    // system time and concurrent calls ran one at a time, so four concurrent
    // Ends read nothing and ended nothing. One pid takes about 2 ms.
    guarded.answer = (args) => {
      const pid = args.at(-1) ?? '';
      return pid === '813'
        ? { code: 1, stdout: '', stderr: '' }
        : { stdout: `  ${pid}   611   812   812 S+   Tue Sep 29 17:41:36 2026     node gemini\n` };
    };
    const table = await defaultEndDeps(NO_PANE_SHOWN).reread([812, 813, 814]);
    expect([...(table?.keys() ?? [])]).toEqual([812, 814]);
    expect(guarded.calls.map((c) => c.args.at(-1))).toEqual(['812', '813', '814']);
    for (const call of guarded.calls) {
      expect(call.args[call.args.indexOf('-p') + 1]).toMatch(/^\d+$/);
    }
  });

  it('reads the wide table once instead above the one-by-one limit', async () => {
    const pids = Array.from({ length: REREAD_ONE_BY_ONE_MAX + 1 }, (_, i) => 1_000 + i);
    guarded.next = {
      stdout: '  1000   611   812   812 S+   Tue Sep 29 17:41:36 2026     node gemini\n' +
        '  5000   611   812   812 S+   Tue Sep 29 17:41:36 2026     not asked\n'
    };
    const table = await defaultEndDeps(NO_PANE_SHOWN).reread(pids);
    expect(guarded.calls.map((c) => c.args)).toEqual([[...TREE_PS_ARGS]]);
    expect([...(table?.keys() ?? [])]).toEqual([1000]);
  });

  it('answers null for a poll when any one pid could not be read, because the rest are then unproved', async () => {
    guarded.answer = (args) =>
      args.at(-1) === '813'
        ? { timedOut: true, code: null }
        : { stdout: `  ${args.at(-1) ?? ''}   611   812   812 S+   Tue Sep 29 17:41:36 2026     node gemini\n` };
    expect(await defaultEndDeps(NO_PANE_SHOWN).reread([812, 813])).toBeNull();
  });

  it('reads `ps -p` exiting 1 with no output as none running, not as a failure', async () => {
    guarded.next = { code: 1, stdout: '', stderr: '' };
    expect((await defaultEndDeps(NO_PANE_SHOWN).reread([812]))?.size).toBe(0);
  });

  it('answers null for a read that did not answer cleanly', async () => {
    for (const next of [
      { code: 1, stderr: 'ps: process id too large: 999998' },
      { timedOut: true, code: null },
      { spawnError: 'ENOENT', code: null },
      { signal: 'SIGKILL' as NodeJS.Signals, code: null }
    ]) {
      guarded.next = next;
      expect(await defaultEndDeps(NO_PANE_SHOWN).reread([812])).toBeNull();
      expect(await defaultEndDeps(NO_PANE_SHOWN).readTable()).toBeNull();
    }
  });

  it('answers null for a read that timed out or was signalled, even when what it printed parses', async () => {
    // The verifier's X12: the clause that refuses a timed-out `ps` had no
    // owner, because a timed-out run carries no exit code and the code check
    // refused it anyway. A read that did not finish is never an answer, so a
    // partial table can never pass as the whole of it.
    const rows = '  812   611   812   812 Ss+  Tue Sep 29 17:41:36 2026     node gemini\n';
    for (const next of [
      { timedOut: true, code: 0, stdout: rows },
      { signal: 'SIGTERM' as NodeJS.Signals, code: 0, stdout: rows },
      { cancelled: true, code: 0, stdout: rows }
    ]) {
      guarded.next = next;
      expect(await defaultEndDeps(NO_PANE_SHOWN).reread([812])).toBeNull();
      expect(await defaultEndDeps(NO_PANE_SHOWN).readTable()).toBeNull();
      expect(await defaultEndDeps(NO_PANE_SHOWN).readTerminals([TTY])).toBeNull();
    }
  });

  it('never runs ps for an empty re-read', async () => {
    expect((await defaultEndDeps(NO_PANE_SHOWN).reread([]))?.size).toBe(0);
    expect(guarded.calls).toHaveLength(0);
  });
});

describe('the argv the tree is read with', () => {
  it('reads one session by its target, every pane, four fields separated by spaces', () => {
    // Spaces, not tabs: tmux sends a tab as `_` to a client whose locale is
    // not UTF-8, which read as no pane and ended nothing.
    expect(PANE_ROOT_FORMAT).toBe('#{pane_pid} #{pane_dead} #{pid} #{pane_tty}');
    expect(PANE_ROOT_FORMAT).not.toContain('\t');
    expect(sessionPanesArgv('$7')).toEqual([
      'list-panes',
      '-s',
      '-t',
      '$7',
      '-F',
      PANE_ROOT_FORMAT
    ]);
    expect([...ALL_PANES_ARGV]).toEqual(['list-panes', '-a', '-F', PANE_ROOT_FORMAT]);
  });

  it('asks the server for every pane it still shows, by its process, for the pane check', () => {
    expect([...LIVE_PANES_ARGV]).toEqual(['list-panes', '-a', '-F', '#{pane_pid}']);
  });
});

// ---------------------------------------------------------------------------
// The pane check (the second fix round, the verifier's S10)
// ---------------------------------------------------------------------------

describe('the pane check', () => {
  it('reads every pane pid, and an answer it does not understand as nothing proved', () => {
    expect([...(parsePanePids('812\n9001\n\n') ?? [])]).toEqual([812, 9001]);
    expect(parsePanePids('')?.size).toBe(0);
    expect(parsePanePids('812\n812_0\n')).toBeNull();
    expect(parsePanePids('%3\n')).toBeNull();
  });

  it('asks the given server, and reads a confirmed "no server" as no pane shown and anything else as unknown', async () => {
    const asked: string[][] = [];
    const shown = livePanesVia(
      (argv) => {
        asked.push([...argv]);
        return Promise.resolve('812\n900\n');
      },
      () => false
    );
    expect([...((await shown()) ?? [])]).toEqual([812, 900]);
    expect(asked).toEqual([[...LIVE_PANES_ARGV]]);
    const gone = livePanesVia(
      () => Promise.reject(new Error('no server running on /private/tmp/tmux-501/x')),
      (err) => /no server running/.test(String((err as Error).message))
    );
    expect((await gone())?.size).toBe(0);
    const unknown = livePanesVia(
      () => Promise.reject(new Error('timed out')),
      (err) => /no server running/.test(String((err as Error).message))
    );
    expect(await unknown()).toBeNull();
  });

  it('drops from a re-read every recorded process whose pane the server still shows', () => {
    const a = row(812, SERVER, 812, 812, 'Ss+', 'node gemini');
    const b = row(813, 812, 812, 812, 'S+', 'node gemini child');
    const c = row(900, SERVER, 900, 900, 'Ss+', 'sleep 3601');
    const table = tableOf(a, b, c);
    const narrowed = hungUpOnly(table, [entry(a), entry(b), entry(c)], new Set([812]));
    expect([...narrowed.keys()].filter((p) => p > SERVER).sort()).toEqual([900]);
    // An empty set leaves the table as it was.
    expect(hungUpOnly(table, [entry(a)], new Set())).toBe(table);
  });
});

// ---------------------------------------------------------------------------
// Roots
// ---------------------------------------------------------------------------

describe('roots', () => {
  it('drops a dead pane, and every line that is not three whole numbers and a terminal', () => {
    expect(
      parsePaneRoots(
        [
          '812 1 611 /dev/ttys001', // dead: its pid is free for the kernel to reuse
          '813 0 611 /dev/ttys002',
          'x 0 611 /dev/ttys003',
          '814 0  /dev/ttys004',
          '815  611 /dev/ttys005',
          '816 0 611 /dev/ttys006 extra',
          '1 0 611 /dev/ttys007',
          '817 0 1 /dev/ttys008',
          '611 0 611 /dev/ttys009',
          '818 0 611 ttys010', // not a terminal path
          '819 0 611 /dev/null',
          '820\t0\t611\t/dev/ttys011', // the old tab form
          '821_0_611_/dev/ttys012', // a tab as tmux sends it to a C-locale client
          ''
        ].join('\n')
      )
    ).toEqual([{ pid: 813, serverPid: 611, tty: '/dev/ttys002' }]);
  });

  it('drops a root whose parent is not the server that answered (a reused pid)', () => {
    // The pane died, and the kernel handed its pid to a stranger whose parent
    // is some other process. It is in the pane's old group number by chance.
    const table = tableOf(
      row(812, 99, 812, 812, 'Ss+', 'stranger --work'),
      row(813, 812, 812, 812, 'S+', 'stranger --child')
    );
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(tree.all).toEqual([]);
    expect(tree.targets).toEqual([]);
  });

  it('drops a root that does not lead its own group, which no pane process can fail to do', () => {
    // tmux starts every pane process with setsid, and a session leader cannot
    // change its group, so a pane pid in some other group is not a pane
    // process at all. Dropping it is what lets the pane check read a target's
    // group as its pane.
    const table = tableOf(
      row(812, SERVER, 700, 700, 'S+', 'stranger --in-another-group'),
      row(813, 812, 700, 700, 'S+', 'stranger --child')
    );
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(tree.all).toEqual([]);
    expect(tree.targets).toEqual([]);
  });

  it('drops a root with no row at all', () => {
    expect(readSessionTree(tableOf(), [ROOT], SELF).all).toEqual([]);
  });

  it('never includes pid 1 or 0, even when the table claims them as descendants', () => {
    const table = tableOf(
      row(812, SERVER, 812, 812, 'Ss+', 'node gemini'),
      row(813, 812, 812, 812, 'S+', 'node gemini child')
    );
    // A server whose parent the table does not hold, so its ancestry stops
    // there and the claims below are asked on their own.
    table.set(SERVER, row(SERVER, 700, SERVER, 0, 'Ss', 'tmux'));
    table.set(1, row(1, 813, 812, 812, 'S+', '/sbin/launchd'));
    table.set(0, row(0, 813, 812, 812, 'S+', 'kernel_task'));
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(pidsIn(tree.all)).toEqual([812, 813]);
    expect(pidsIn(tree.targets)).toEqual([812, 813]);
  });

  it('refuses the whole tree when a claim runs through the server’s own ancestry', () => {
    // launchd is the server's parent; a table claiming launchd under the pane
    // puts the pane among the server's ancestors, and those are never included.
    const table = tableOf(
      row(812, SERVER, 812, 812, 'Ss+', 'node gemini'),
      row(813, 812, 812, 812, 'S+', 'node gemini child')
    );
    table.set(1, row(1, 813, 812, 812, 'S+', '/sbin/launchd'));
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(tree.all).toEqual([]);
    expect(tree.targets).toEqual([]);
  });

  it('never includes the server: a table that puts it under the pane refuses the whole tree', () => {
    // The server's own ancestors are never included, and here the pane is one.
    const table = tableOf(
      row(812, SERVER, 812, 812, 'Ss+', 'node gemini'),
      row(813, 812, 812, 812, 'S+', 'node gemini child')
    );
    table.set(SERVER, row(SERVER, 813, 812, 812, 'S+', 'tmux -L gmux-p323'));
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(pidsIn(tree.all)).not.toContain(SERVER);
    expect(tree.targets).toEqual([]);
  });

  it('never includes this process, nor anything it is running under', () => {
    const table = tableOf(
      row(812, SERVER, 812, 812, 'Ss+', 'zsh'),
      row(900, 812, 812, 812, 'S+', 'npm run dev'),
      row(SELF, 900, 812, 812, 'S+', 'Tortie')
    );
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(pidsIn(tree.all)).not.toContain(SELF);
    expect(pidsIn(tree.targets)).not.toContain(SELF);
    // The shell and npm are what this process is waiting under.
    expect(pidsIn(tree.targets)).not.toContain(900);
    expect(pidsIn(tree.targets)).not.toContain(812);
  });

  it('never includes the server when it is the root’s parent, the ordinary case', () => {
    const table = tableOf(row(812, SERVER, 812, 812, 'Ss+', 'claude'));
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(pidsIn(tree.all)).toEqual([812]);
  });

  it('terminates on a cycle in the table', () => {
    const table = tableOf(
      row(812, SERVER, 812, 812, 'Ss+', 'a'),
      row(900, 812, 812, 812, 'S+', 'b')
    );
    table.set(SERVER, row(SERVER, 900, SERVER, 0, 'Ss', 'tmux'));
    // and this process's ancestry loops on itself
    table.set(SELF, row(SELF, 4243, SELF, 0, 'S', 'Tortie'));
    table.set(4243, row(4243, SELF, 4243, 0, 'S', 'shim'));
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(tree.targets).toEqual([]);
  });

  it('holds the 4,096 cap', () => {
    const rows: TreeRow[] = [row(812, SERVER, 812, 812, 'Ss+', 'sh')];
    let parent = 812;
    for (let pid = 10_000; pid < 15_000; pid += 1) {
      rows.push(row(pid, parent, 812, 812, 'S+', 'sh'));
      parent = pid;
    }
    const tree = readSessionTree(tableOf(...rows), [ROOT], SELF);
    expect(tree.all.length).toBe(4_097);
  });

  it('counts a pid shared by two roots once', () => {
    const table = tableOf(
      row(812, SERVER, 812, 812, 'Ss+', 'a'),
      row(813, SERVER, 813, 813, 'Ss+', 'b')
    );
    const tree = readSessionTree(
      table,
      [ROOT, ROOT, { pid: 813, serverPid: SERVER, tty: '/dev/ttys013' }],
      SELF
    );
    expect(pidsIn(tree.all)).toEqual([812, 813]);
  });
});

// ---------------------------------------------------------------------------
// Selection, one planted table per census shape
// ---------------------------------------------------------------------------

describe('selection', () => {
  it('created Gemini: both processes are targets', () => {
    const table = tableOf(
      row(812, SERVER, 812, 812, 'Ss+', 'node /opt/homebrew/bin/gemini'),
      row(813, 812, 812, 812, 'S+', 'node --max-old-space-size=8192 /opt/homebrew/bin/gemini')
    );
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(pidsIn(tree.targets)).toEqual([812, 813]);
  });

  it('restored: the shell by its own group, and never the terminal’s foreground group', () => {
    // The second fix round. Every agent the census launched this way ends on
    // the hang-up by itself (SPEC §3: 27 restored rows, 0 survivors), so the
    // foreground group bought nothing, and it is whatever a person put in front
    // of the shell.
    const table = tableOf(
      row(812, SERVER, 812, 900, 'Ss', '-zsh'),
      row(900, 812, 900, 900, 'S+', 'node /opt/homebrew/bin/gemini'),
      row(901, 900, 900, 900, 'S+', 'node gemini child')
    );
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(pidsIn(tree.all)).toEqual([812, 900, 901]);
    expect(pidsIn(tree.targets)).toEqual([812]);
  });

  it('a person’s foreground job in a restored agent row is never a target (attack d2)', () => {
    // `nohup sh -c "trap '' HUP; exec sleep 600"` typed at the restored shell
    // before the armed resume was entered: the terminal's foreground group.
    // Today it outlives End; it must still (the verifier measured it ended).
    const table = tableOf(
      row(812, SERVER, 812, 950, 'Ss', '-zsh'),
      row(950, 812, 950, 950, 'S+', '/bin/sleep 600')
    );
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(pidsIn(tree.targets)).toEqual([812]);
  });

  it('wrapped: specstory and the agent', () => {
    const table = tableOf(
      row(812, SERVER, 812, 812, 'Ss+', '/x/specstory run gemini -c gemini'),
      row(813, 812, 812, 812, 'S+', 'node gemini')
    );
    expect(pidsIn(readSessionTree(table, [ROOT], SELF).targets)).toEqual([812, 813]);
  });

  it('a setsid child is never a target', () => {
    const table = tableOf(
      row(812, SERVER, 812, 812, 'Ss+', 'sleep 600'),
      row(813, 812, 813, 0, 'Ss', 'sleep 900')
    );
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(pidsIn(tree.all)).toEqual([812, 813]);
    expect(pidsIn(tree.targets)).toEqual([812]);
  });

  it('a person’s background job in its own group is never a target', () => {
    // `nohup sleep 600 &` at an idle prompt: the shell is the foreground.
    const table = tableOf(
      row(812, SERVER, 812, 812, 'Ss+', '-zsh'),
      row(830, 812, 830, 812, 'SN', 'sleep 600')
    );
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(pidsIn(tree.targets)).toEqual([812]);
  });

  it('Codex’s shared server: only the launcher and the TUI are targets', () => {
    // SPEC §2.1: a single fork `setsid` child of whichever Codex TUI found none
    // running, used by every other Codex session on the Mac.
    const table = tableOf(
      row(812, SERVER, 812, 812, 'Ss+', 'node /x/bin/codex'),
      row(813, 812, 812, 812, 'S+', '/x/codex/codex'),
      row(814, 813, 814, 0, 'Ss', 'codex app-server daemon pid-update-loop'),
      row(815, 814, 814, 0, 'S', 'codex app-server --listen unix:// --managed-daemon'),
      row(816, 815, 814, 0, 'S', 'codex app-server host')
    );
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(pidsIn(tree.all)).toEqual([812, 813, 814, 815, 816]);
    expect(pidsIn(tree.targets)).toEqual([812, 813]);
  });

  it('an application bundle’s executable in the pane’s group is never a target', () => {
    const table = tableOf(
      row(812, SERVER, 812, 812, 'Ss+', '-zsh'),
      row(900, 812, 812, 812, 'S+', '/private/tmp/run/Fake.app/Contents/MacOS/fake 600'),
      // argv[0] can hold a space, so the whole line is asked
      row(
        901,
        812,
        812,
        812,
        'S+',
        '/Applications/Visual Studio Code.app/Contents/MacOS/Electron cli.js --wait'
      )
    );
    const tree = readSessionTree(table, [ROOT], SELF);
    expect(pidsIn(tree.all)).toEqual([812, 900, 901]);
    expect(pidsIn(tree.targets)).toEqual([812]);
  });

  it('reads the whole shape from `ps` text end to end', () => {
    const text = [
      '    1     0     1    0 Ss   Sun Sep  6 12:06:32 2026     /sbin/launchd',
      '  611     1   611    0 Ss   Tue Sep 29 17:40:00 2026     tmux -L gmux-p323 new-session',
      '  812   611   812   812 Ss+  Tue Sep 29 17:41:36 2026     node /opt/homebrew/bin/gemini',
      '  813   812   812   812 S+   Tue Sep 29 17:41:37 2026     node gemini child',
      '  814   813   814    0 Ss   Tue Sep 29 17:41:38 2026     npm install -g @google/gemini-cli'
    ].join('\n');
    const tree = readSessionTree(parseTreeTable(text), parsePaneRoots('812 0 611 /dev/ttys012\n'), SELF);
    expect(pidsIn(tree.all)).toEqual([812, 813, 814]);
    expect(pidsIn(tree.targets)).toEqual([812, 813]);
  });
});

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

describe('stillTheSame', () => {
  const was = row(900, 812, 812, 812, 'S+', 'node gemini');
  const recorded = [entry(was)];

  it('keeps the same process', () => {
    expect(stillTheSame(recorded, tableOf(was))).toEqual(recorded);
  });

  it('drops a reused pid: same number, another start time', () => {
    expect(
      stillTheSame(
        recorded,
        tableOf({ ...was, lstart: 'Tue Sep 29 17:41:37 2026' })
      )
    ).toEqual([]);
  });

  it('drops a process that exec’d another program after the read', () => {
    expect(
      stillTheSame(recorded, tableOf({ ...was, command: 'vim notes.md' }))
    ).toEqual([]);
  });

  it('drops a process that exec’d the same program with other arguments', () => {
    expect(
      stillTheSame(recorded, tableOf({ ...was, command: 'node gemini --resume' }))
    ).toEqual([]);
    expect(stillTheSame(recorded, tableOf({ ...was, command: 'node' }))).toEqual([]);
  });

  it('drops a process that left its group after the read', () => {
    expect(stillTheSame(recorded, tableOf({ ...was, pgid: 900 }))).toEqual([]);
  });

  it('never adds a process that joined the group after the read', () => {
    const joined = row(950, 812, 812, 812, 'S+', 'node gemini');
    expect(stillTheSame(recorded, tableOf(was, joined))).toEqual(recorded);
  });

  it('drops a process that exited', () => {
    expect(stillTheSame(recorded, tableOf())).toEqual([]);
  });

  it('does not care that a process was re-parented', () => {
    expect(stillTheSame(recorded, tableOf({ ...was, ppid: 1 }))).toEqual(recorded);
  });
});

describe('basenameOf', () => {
  it('names the program and never the arguments', () => {
    expect(basenameOf('node /opt/homebrew/bin/gemini --api-key secret')).toBe('node');
    expect(basenameOf('/usr/bin/perl -e 1')).toBe('perl');
    expect(basenameOf('-zsh')).toBe('-zsh');
    expect(basenameOf('')).toBe('?');
  });
});

// ---------------------------------------------------------------------------
// Ending, over a fake world and a fake clock
// ---------------------------------------------------------------------------

interface Planted {
  row: TreeRow;
  /** The clock time it exits on its own, if it does. */
  exitsAt?: number;
  /** The signals that end it. */
  endsOn?: Array<'SIGTERM' | 'SIGKILL'>;
  /** From this time on, `ps` shows it with these fields changed. */
  changesAt?: { at: number; to: Partial<TreeRow> };
}

interface World {
  deps: EndDeps;
  kills: Array<{ pid: number; signal: string; at: number }>;
  rereads: number[];
  /** When each pane check was asked. */
  paneChecks: number[];
  clock(): number;
}

/**
 * A world whose `ps` answers EVERY live process, whatever it was asked, which
 * is worse than the real one: a process the function did not record must
 * still never be signalled.
 */
function world(
  planted: Planted[],
  failRereadAt: (n: number) => boolean = () => false,
  /** The panes the server still shows, by process; null: the pane check fails. */
  shownPanes: (t: number) => ReadonlySet<number> | null = () => new Set()
): World {
  let t = 0;
  const gone = new Set<number>();
  const kills: World['kills'] = [];
  const rereads: number[] = [];
  const paneChecks: number[] = [];
  const shown = (p: Planted): TreeRow | null => {
    if (gone.has(p.row.pid)) return null;
    if (p.exitsAt !== undefined && t >= p.exitsAt) return null;
    if (p.changesAt !== undefined && t >= p.changesAt.at) {
      return { ...p.row, ...p.changesAt.to };
    }
    return p.row;
  };
  const deps: EndDeps = {
    readTable: () => Promise.reject(new Error('the ending never reads the wide table')),
    readTerminals: () => Promise.reject(new Error('the ending never reads a terminal')),
    reread: (pids) => {
      rereads.push(t);
      expect(pids.length).toBeGreaterThan(0);
      if (failRereadAt(rereads.length)) return Promise.resolve(null);
      const m = new Map<number, TreeRow>();
      for (const p of planted) {
        const r = shown(p);
        if (r !== null) m.set(r.pid, r);
      }
      return Promise.resolve(m);
    },
    livePanes: () => {
      paneChecks.push(t);
      return Promise.resolve(shownPanes(t));
    },
    kill: (pid, signal) => {
      expect(pid).toBeGreaterThan(1);
      expect(pid).not.toBe(process.pid);
      kills.push({ pid, signal, at: t });
      const p = planted.find((x) => x.row.pid === pid);
      if (p === undefined || shown(p) === null) {
        throw Object.assign(new Error('kill ESRCH'), { code: 'ESRCH' });
      }
      if (p.endsOn?.includes(signal as 'SIGTERM' | 'SIGKILL') === true) {
        gone.add(pid);
      }
    },
    sleep: (ms) => {
      t += ms;
      return Promise.resolve();
    },
    now: () => t
  };
  return { deps, kills, rereads, paneChecks, clock: () => t };
}

function treeOf(...planted: Planted[]): SessionTree {
  const entries = planted.map((p) => entry(p.row));
  return { all: entries, targets: entries };
}

const LAUNCHER = row(812, SERVER, 812, 812, 'Ss+', 'node /opt/homebrew/bin/gemini');
const CHILD = row(813, 812, 812, 812, 'S+', 'node gemini child');

describe('endHangupSurvivors', () => {
  it('returns at once with nothing to do', async () => {
    const w = world([]);
    const report = await endHangupSurvivors({ all: [], targets: [] }, w.deps);
    expect(report).toEqual({ ended: [], readFailed: false });
    expect(w.rereads).toEqual([]);
  });

  it('sends no signal when everything exits within the hang-up’s grace', async () => {
    const planted = [
      { row: LAUNCHER, exitsAt: 1_534 },
      { row: CHILD, exitsAt: 900 }
    ];
    const w = world(planted);
    const report = await endHangupSurvivors(treeOf(...planted), w.deps);
    expect(w.kills).toEqual([]);
    expect(report).toEqual({ ended: [], readFailed: false });
  });

  it('returns at the first re-read after the targets are gone', async () => {
    const planted = [{ row: LAUNCHER, exitsAt: 1_100 }];
    const w = world(planted);
    await endHangupSurvivors(treeOf(...planted), w.deps);
    // Re-read at 0, 250, 500, 750, 1000 (still there) and 1250 (gone).
    expect(w.rereads).toEqual([0, 250, 500, 750, 1_000, 1_250]);
    expect(w.clock()).toBe(1_250);
    expect(w.kills).toEqual([]);
  });

  it('re-reads quickly after the hang-up, then waits once to the grace’s end, and the same after SIGTERM', async () => {
    // The second fix round lengthened the graces to 10 s and 60 s; a re-read
    // every 250 ms across them would spawn a `ps` for nothing. The quick
    // re-reads cover the slowest orderly exit the census measured (1,534 ms).
    const planted: Planted[] = [{ row: LAUNCHER, endsOn: ['SIGKILL'] }];
    const w = world(planted);
    await endHangupSurvivors(treeOf(...planted), w.deps);
    const quick = (from: number): number[] =>
      Array.from({ length: QUICK_POLLS_MS / POLL_MS + 1 }, (_, i) => from + i * POLL_MS);
    expect(w.rereads).toEqual([
      ...quick(0),
      HANGUP_GRACE_MS,
      ...quick(HANGUP_GRACE_MS).slice(1),
      HANGUP_GRACE_MS + TERM_GRACE_MS
    ]);
    // The pane check is asked only at a step that may signal.
    expect(w.paneChecks).toEqual([HANGUP_GRACE_MS, HANGUP_GRACE_MS + TERM_GRACE_MS]);
    expect(w.kills.map((k) => k.signal)).toEqual(['SIGTERM', 'SIGKILL']);
  });

  it('ends a survivor with SIGTERM after the grace, and sends no SIGKILL when that is enough', async () => {
    const planted: Planted[] = [
      { row: LAUNCHER, endsOn: ['SIGTERM'] },
      { row: CHILD, endsOn: ['SIGTERM'] }
    ];
    const w = world(planted);
    const report = await endHangupSurvivors(treeOf(...planted), w.deps);
    expect(w.kills).toEqual([
      { pid: 812, signal: 'SIGTERM', at: HANGUP_GRACE_MS },
      { pid: 813, signal: 'SIGTERM', at: HANGUP_GRACE_MS }
    ]);
    expect(report).toEqual({
      ended: [
        { pid: 812, name: 'node', signal: 'SIGTERM' },
        { pid: 813, name: 'node', signal: 'SIGTERM' }
      ],
      readFailed: false
    });
    // And it returned at the first re-read after SIGTERM, not at the grace.
    expect(w.clock()).toBe(HANGUP_GRACE_MS + POLL_MS);
  });

  it('ends one that resists SIGTERM with SIGKILL after the second grace', async () => {
    const planted: Planted[] = [{ row: LAUNCHER, endsOn: ['SIGKILL'] }];
    const w = world(planted);
    const report = await endHangupSurvivors(treeOf(...planted), w.deps);
    expect(w.kills).toEqual([
      { pid: 812, signal: 'SIGTERM', at: HANGUP_GRACE_MS },
      { pid: 812, signal: 'SIGKILL', at: HANGUP_GRACE_MS + TERM_GRACE_MS }
    ]);
    expect(report.ended).toEqual([{ pid: 812, name: 'node', signal: 'SIGKILL' }]);
  });

  it('sends SIGKILL only to what the re-read after SIGTERM still showed', async () => {
    const planted: Planted[] = [
      { row: LAUNCHER, endsOn: ['SIGTERM'] },
      { row: CHILD, endsOn: ['SIGKILL'] }
    ];
    const w = world(planted);
    const report = await endHangupSurvivors(treeOf(...planted), w.deps);
    expect(w.kills).toEqual([
      { pid: 812, signal: 'SIGTERM', at: HANGUP_GRACE_MS },
      { pid: 813, signal: 'SIGTERM', at: HANGUP_GRACE_MS },
      { pid: 813, signal: 'SIGKILL', at: HANGUP_GRACE_MS + TERM_GRACE_MS }
    ]);
    expect(report.ended).toEqual([
      { pid: 812, name: 'node', signal: 'SIGTERM' },
      { pid: 813, name: 'node', signal: 'SIGKILL' }
    ]);
  });

  it('signals only what the re-read before it still showed (one exits during the wait)', async () => {
    const planted: Planted[] = [
      { row: LAUNCHER, exitsAt: 3_000 },
      { row: CHILD, endsOn: ['SIGTERM'] }
    ];
    const w = world(planted);
    await endHangupSurvivors(treeOf(...planted), w.deps);
    expect(w.kills).toEqual([{ pid: 813, signal: 'SIGTERM', at: HANGUP_GRACE_MS }]);
  });

  it('never signals a pid reused during the wait', async () => {
    const planted: Planted[] = [
      {
        row: CHILD,
        changesAt: { at: 2_000, to: { lstart: 'Tue Sep 29 17:45:00 2026' } }
      }
    ];
    const w = world(planted);
    await endHangupSurvivors(treeOf(...planted), w.deps);
    expect(w.kills).toEqual([]);
  });

  it('never signals a process that exec’d another program during the wait', async () => {
    const planted: Planted[] = [
      { row: CHILD, changesAt: { at: 2_000, to: { command: 'vim notes.md' } } }
    ];
    const w = world(planted);
    await endHangupSurvivors(treeOf(...planted), w.deps);
    expect(w.kills).toEqual([]);
  });

  it('never signals a process that left its group during the wait', async () => {
    const planted: Planted[] = [
      { row: CHILD, changesAt: { at: 2_000, to: { pgid: 813 } } }
    ];
    const w = world(planted);
    await endHangupSurvivors(treeOf(...planted), w.deps);
    expect(w.kills).toEqual([]);
  });

  it('never signals a process that joined the group after the read', async () => {
    const joined = row(950, 812, 812, 812, 'S+', 'node gemini child');
    const planted: Planted[] = [
      { row: CHILD, endsOn: ['SIGTERM'] },
      { row: joined }
    ];
    const w = world(planted);
    // Only CHILD was recorded; the world's `ps` shows both.
    await endHangupSurvivors(treeOf(planted[0] as Planted), w.deps);
    expect(w.kills.map((k) => k.pid)).toEqual([813]);
  });

  it('never signals a process that exec’d the same program with other arguments during the wait', async () => {
    const planted: Planted[] = [
      { row: CHILD, changesAt: { at: 2_000, to: { command: 'node gemini child --again' } } }
    ];
    const w = world(planted);
    await endHangupSurvivors(treeOf(...planted), w.deps);
    expect(w.kills).toEqual([]);
  });

  it('never signals a target whose pane another session still shows (a grouped session, a linked window)', async () => {
    // The verifier's S10: `kill-session` of a session whose window another
    // session shows leaves the pane alive and sends it no hang-up. The build
    // before the second fix round sent SIGTERM to that live pane's process.
    const planted: Planted[] = [
      { row: LAUNCHER, endsOn: ['SIGTERM'] },
      { row: CHILD, endsOn: ['SIGTERM'] }
    ];
    const w = world(planted, () => false, () => new Set([812]));
    const report = await endHangupSurvivors(treeOf(...planted), w.deps);
    expect(w.kills).toEqual([]);
    expect(report).toEqual({ ended: [], readFailed: false });
    expect(w.paneChecks).toEqual([HANGUP_GRACE_MS]);
  });

  it('ends what a closed pane left, and spares a pane another session still shows, in one ending', async () => {
    const other = row(900, SERVER, 900, 900, 'Ss+', 'perl -e ignore-hup');
    const planted: Planted[] = [
      { row: LAUNCHER, endsOn: ['SIGTERM'] },
      { row: CHILD, endsOn: ['SIGTERM'] },
      { row: other, endsOn: ['SIGTERM'] }
    ];
    const w = world(planted, () => false, () => new Set([900, 4444]));
    await endHangupSurvivors(treeOf(...planted), w.deps);
    expect(w.kills.map((k) => k.pid).sort()).toEqual([812, 813]);
  });

  it('signals nothing while the pane check does not answer, and asks it again', async () => {
    const planted: Planted[] = [{ row: LAUNCHER, endsOn: ['SIGTERM'] }];
    const w = world(planted, () => false, (t) => (t < HANGUP_GRACE_MS + 1_000 ? null : new Set()));
    const report = await endHangupSurvivors(treeOf(...planted), w.deps);
    expect(w.kills).toHaveLength(1);
    expect(w.kills[0]?.at).toBeGreaterThanOrEqual(HANGUP_GRACE_MS + 1_000);
    expect(report.readFailed).toBe(false);
    const never = world(planted.map((p) => ({ ...p })), () => false, () => null);
    const gaveUp = await endHangupSurvivors(treeOf(...planted), never.deps);
    expect(never.kills).toEqual([]);
    expect(gaveUp).toEqual({ ended: [], readFailed: true });
  });

  it('never signals pid 1 or 0, even when a malformed tree names them and the re-read answers for them', async () => {
    // The verifier's X13: the `pid <= 1` guard in each signal loop had no
    // owner. It is the last thing between a malformed tree and `kill(0)`,
    // which signals the caller's own group, or `kill(1)`, launchd.
    const init = row(1, 0, 1, 0, 'Ss', '/sbin/launchd');
    const zero = row(0, 0, 0, 0, 'Ss', 'kernel_task');
    const planted: Planted[] = [{ row: init }, { row: zero }, { row: LAUNCHER, endsOn: ['SIGKILL'] }];
    const w = world(planted);
    const asked: number[] = [];
    const deps: EndDeps = {
      ...w.deps,
      kill: (pid, signal) => {
        asked.push(pid);
        if (pid > 1) w.deps.kill(pid, signal);
      }
    };
    await endHangupSurvivors(treeOf(...planted), deps);
    expect(asked).toEqual([812, 812]);
  });

  it('never signals what left the terminal, even under a root that resists both signals', async () => {
    // R1's held half, at the signal and not only at the selection: a root in
    // the pane's group that ignores SIGHUP and SIGTERM, and its `setsid` child
    // in a group of its own. The child is in `all` and not in `targets`, and
    // the world's `ps` shows it on every re-read.
    const root = row(812, SERVER, 812, 812, 'Ss+', 'perl -e ignore-hup-and-term');
    const setsid = row(813, 812, 813, 0, 'Ss', 'sleep 900');
    const planted: Planted[] = [{ row: root, endsOn: ['SIGKILL'] }, { row: setsid }];
    const w = world(planted);
    await endHangupSurvivors({ all: [entry(root), entry(setsid)], targets: [entry(root)] }, w.deps);
    expect(w.kills).toEqual([
      { pid: 812, signal: 'SIGTERM', at: HANGUP_GRACE_MS },
      { pid: 812, signal: 'SIGKILL', at: HANGUP_GRACE_MS + TERM_GRACE_MS }
    ]);
  });

  // The re-reads, numbered: nine quick ones from 0 to 2,000 ms, the tenth at
  // the grace's end (the one that sends SIGTERM), then the quick ones after it.
  it.each([
    ['the first re-read', [1]],
    ['a re-read inside the hang-up’s grace', [5]],
    ['the re-read that would have sent SIGTERM, and two after it', [10, 11, 12]],
    ['a re-read after SIGTERM', [11]]
  ])('keeps asking when %s fails, and signals only after a re-read that answered', async (_label, failing) => {
    const planted: Planted[] = [{ row: LAUNCHER, endsOn: ['SIGKILL'] }];
    const w = world(planted, (n) => failing.includes(n));
    const answered: boolean[] = [];
    const deps: EndDeps = {
      ...w.deps,
      reread: async (pids) => {
        const table = await w.deps.reread(pids);
        answered.push(table !== null);
        return table;
      },
      kill: (pid, signal) => {
        // The re-read just before every signal answered.
        expect(answered.at(-1)).toBe(true);
        w.deps.kill(pid, signal);
      }
    };
    const report = await endHangupSurvivors(treeOf(...planted), deps);
    expect(report.readFailed).toBe(false);
    expect(w.kills.map((k) => k.signal)).toEqual(['SIGTERM', 'SIGKILL']);
    expect(report.ended).toEqual([{ pid: 812, name: 'node', signal: 'SIGKILL' }]);
  });

  it('gives up having signalled nothing when no re-read answers within the retry window', async () => {
    const planted: Planted[] = [{ row: LAUNCHER, endsOn: ['SIGTERM'] }];
    const w = world(planted, () => true);
    const report = await endHangupSurvivors(treeOf(...planted), w.deps);
    expect(report).toEqual({ ended: [], readFailed: true });
    expect(w.kills).toEqual([]);
    expect(w.clock()).toBeGreaterThanOrEqual(HANGUP_GRACE_MS + READ_RETRY_MS);
    expect(w.clock()).toBeLessThan(HANGUP_GRACE_MS + READ_RETRY_MS + POLL_MS);
  });

  it('sends no SIGKILL when the re-reads after SIGTERM stop answering', async () => {
    const planted: Planted[] = [{ row: LAUNCHER, endsOn: ['SIGKILL'] }];
    const w = world(planted, (n) => n > 10);
    const report = await endHangupSurvivors(treeOf(...planted), w.deps);
    expect(report.readFailed).toBe(true);
    expect(w.kills.map((k) => k.signal)).toEqual(['SIGTERM']);
  });

  it('never throws: a re-read that throws is a failed read', async () => {
    const planted: Planted[] = [{ row: LAUNCHER, endsOn: ['SIGTERM'] }];
    const w = world(planted);
    const deps: EndDeps = {
      ...w.deps,
      reread: () => Promise.reject(new Error('ps exploded'))
    };
    const report = await endHangupSurvivors(treeOf(...planted), deps);
    expect(report).toEqual({ ended: [], readFailed: true });
    expect(w.kills).toEqual([]);
  });

  it('records nothing for a pid that went between the re-read and the signal', async () => {
    const planted: Planted[] = [{ row: LAUNCHER }];
    const w = world(planted);
    const deps: EndDeps = {
      ...w.deps,
      kill: (pid, signal) => {
        w.kills.push({ pid, signal, at: w.clock() });
        throw Object.assign(new Error('kill ESRCH'), { code: 'ESRCH' });
      }
    };
    const report = await endHangupSurvivors(treeOf(...planted), deps);
    expect(report.ended).toEqual([]);
    expect(report.readFailed).toBe(false);
  });

  it('ends by ENDING_WORST_MS, the bound the closing check waits for, behind an adversarial ps and tmux', async () => {
    // The graces (the second fix round): the first is at least twice the 5 s
    // orderly exit the verifier planted (S9), and the two together outlast
    // Claude Code's own shutdown failsafe, 65 s at the most (read from 2.1.285:
    // its SessionEnd hook timeout, capped at 60 s, plus 5 s).
    expect(HANGUP_GRACE_MS).toBeGreaterThanOrEqual(2 * 5_000);
    expect(HANGUP_GRACE_MS + TERM_GRACE_MS).toBeGreaterThanOrEqual(65_000 + 5_000);
    expect(TERM_GRACE_MS).toBeGreaterThan(1_465);
    expect(QUICK_POLLS_MS).toBeGreaterThanOrEqual(1_534);
    expect(QUICK_POLLS_MS).toBeLessThan(HANGUP_GRACE_MS);
    expect(READ_RETRY_MS).toBeGreaterThanOrEqual(9_000);
    expect(ENDING_WORST_MS).toBe(
      HANGUP_GRACE_MS + TERM_GRACE_MS + 2 * (READ_RETRY_MS + POLL_MS + 2 * TREE_READ_TIMEOUT_MS)
    );
    // DRIVEN, not added up: a process that ignores both signals, behind a pane
    // check that fails once at each signal step, landing a millisecond before
    // the give-up line, and then a pane check and a re-read that each answer a
    // millisecond under a read's bound. That places each signal as late as the
    // loop allows.
    const w = world([{ row: LAUNCHER }]);
    const slowest = TREE_READ_TIMEOUT_MS - 1;
    let dueAt = HANGUP_GRACE_MS;
    let giveUpAt = HANGUP_GRACE_MS + READ_RETRY_MS;
    let failed = false;
    const deps: EndDeps = {
      ...w.deps,
      livePanes: async () => {
        const start = w.clock();
        if (!failed && start < giveUpAt - 1) {
          await w.deps.sleep(giveUpAt - 1 - start);
          failed = true;
          return null;
        }
        failed = false;
        await w.deps.sleep(slowest);
        return w.deps.livePanes();
      },
      reread: async (pids) => {
        if (w.clock() >= dueAt) await w.deps.sleep(slowest);
        return w.deps.reread(pids);
      },
      kill: (pid, signal) => {
        w.deps.kill(pid, signal);
        if (signal === 'SIGTERM') {
          dueAt = w.clock() + TERM_GRACE_MS;
          giveUpAt = dueAt + READ_RETRY_MS;
        }
      }
    };
    await endHangupSurvivors(treeOf({ row: LAUNCHER }), deps);
    const last = w.kills.at(-1);
    expect(w.kills.map((k) => k.signal)).toEqual(['SIGTERM', 'SIGKILL']);
    expect(last?.at ?? Infinity).toBeLessThanOrEqual(ENDING_WORST_MS);
    expect(last?.at).toBe(ENDING_WORST_MS - 6);
  });
});
