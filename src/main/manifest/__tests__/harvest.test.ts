/**
 * The ONE store watcher, per agent (Phase 13.5 — research 22 §3.2/§3.3).
 *
 * These tests exist because the thing they cover used to be a comment. Every
 * agent except codex fell into a branch called 'store-watch' that watched
 * nothing, and the failure was invisible until a reboot: the pane came back
 * as a bare directory with the conversation still on disk and no argv to
 * reach it. So each agent's store is reproduced here in a temp home — the
 * real filename shapes and the real records that carry the correlation key —
 * and the watcher is asked to find the right session among rivals.
 *
 * Hermetic lane. Nothing here reads this machine: the agy ownership probe is
 * mocked whole below, and the process table is SCRIPTED through the seam in
 * ../harvest/process-table.ts. Before Phase 171 the ppid walk was proved by
 * asking the live `ps` about the test runner's own parent, which was the one
 * read of the host process table left in the hermetic lane, found by running
 * the lane with `ps` masked from PATH. The walk is proved here against the
 * shape MEASURED on the real qwen CLI instead, and the live half lives in
 * process-table.native.test.ts.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { harvestProvenance } from '../agents';
import {
  agentHarvestsId,
  agentRescuesId,
  agentRescuesIdAfterExit,
  isDescendantOf,
  resetProcessParentCache,
  sanitizeOmpCwd,
  sanitizePiCwd,
  sanitizeQwenCwd,
  watchForSessionId,
  type HarvestContext
} from '../harvest';
import {
  isDescendantIn,
  parseProcessTable,
  setProcessTableReader
} from '../harvest/process-table';

let home = '';
let cwd = '';

/**
 * The scripted agy ownership probe (Phase 32). The default, ok: false, is
 * "lsof or ps could not answer", which degrades antigravity to exactly its
 * pre-Phase-32 grace-timer behavior. A test that wants an exact confirm
 * scripts `owned` per pane pid. Mocked whole so no test here ever runs ps or
 * lsof against the real machine.
 */
const agyProbe = vi.hoisted(() => ({
  ok: false,
  owned: new Map<number, Set<string>>()
}));

vi.mock('../harvest/agy-owner', () => ({
  agyOwnedConversations: (_brainRoot: string, panePid: number) =>
    Promise.resolve(
      agyProbe.ok
        ? { ok: true, ownedIds: new Set(agyProbe.owned.get(panePid) ?? []) }
        : { ok: false, ownedIds: new Set<string>() }
    ),
  resetAgyOwnershipCache: () => undefined
}));

/** Fast polling so a test does not wait on a 1 Hz clock. */
const FAST = { pollIntervalMs: 25, timeoutMs: 4_000, graceMs: 150 } as const;

/**
 * The process table every test here sees, as `ps -Axo pid=,ppid=,comm=`
 * prints it. The qwen rows are the shape MEASURED on the real CLI: the pane's
 * shell is 1615, the launcher it forks is 1622, and 1644 is the grandchild
 * whose pid lands in runtime.json. The Chrome rows carry spaces in `comm`,
 * which is the parse hazard the reader guards against.
 */
const PANE_PID = 1615;
const QWEN_LAUNCHER_PID = 1622;
const QWEN_PID = 1644;
const STRANGER_PID = 2001;
const SCRIPTED_PS = [
  '    1     0 /sbin/launchd',
  '  900     1 /opt/homebrew/bin/tmux',
  ` ${String(PANE_PID)}   900 -zsh`,
  ` ${String(QWEN_LAUNCHER_PID)}  ${String(PANE_PID)} node`,
  ` ${String(QWEN_PID)}  ${String(QWEN_LAUNCHER_PID)} qwen`,
  ' 2000     1 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ` ${String(STRANGER_PID)}  2000 /Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Helper.app/Contents/MacOS/Google Chrome Helper`,
  ''
].join('\n');

function ctx(extra: Partial<HarvestContext> = {}): HarvestContext {
  return { cwd, sinceTs: Date.now() - 500, ...extra };
}

function write(path: string, body: string): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, body);
}

function jsonl(...records: unknown[]): string {
  return records.map((r) => `${JSON.stringify(r)}\n`).join('');
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'gmux-harvest-home-'));
  cwd = mkdtempSync(join(tmpdir(), 'gmux-harvest-cwd-'));
  resetProcessParentCache();
  setProcessTableReader(() => Promise.resolve(SCRIPTED_PS));
  agyProbe.ok = false;
  agyProbe.owned.clear();
});

afterEach(() => {
  setProcessTableReader(null);
  rmSync(home, { recursive: true, force: true });
  rmSync(cwd, { recursive: true, force: true });
});

describe('codex — filename uuid + line-1 session_meta cwd', () => {
  const rollout = (uuid: string, stamp = '2099-01-01T00-00-00'): string =>
    `rollout-${stamp}-${uuid}.jsonl`;

  it('picks the rollout whose recorded cwd is ours, not the newest one', async () => {
    const mine = 'aaaaaaaa-1111-4111-8111-111111111111';
    const theirs = 'bbbbbbbb-2222-4222-8222-222222222222';
    const dir = join(home, '.codex', 'sessions', '2099', '01', '01');
    write(
      join(dir, rollout(theirs)),
      jsonl({ payload: { cwd: '/somewhere/else' } })
    );
    write(join(dir, rollout(mine)), jsonl({ payload: { cwd } }));

    const watch = watchForSessionId('codex', ctx(), { home, ...FAST });
    await expect(watch.promise).resolves.toMatchObject({
      sessionId: mine,
      key: 'cwd-newest',
      confidence: 'exact',
      viaGraceTimer: false
    });
  });

  it('honours CODEX_HOME', async () => {
    const uuid = 'cccccccc-3333-4333-8333-333333333333';
    const codexHome = join(home, 'elsewhere');
    write(
      join(codexHome, 'sessions', '2099', '01', '01', rollout(uuid)),
      jsonl({ payload: { cwd } })
    );
    const watch = watchForSessionId('codex', ctx(), {
      home,
      env: { CODEX_HOME: codexHome },
      ...FAST
    });
    await expect(watch.promise).resolves.toMatchObject({ sessionId: uuid });
  });

  it('accepts an unclassifiable rollout only after the grace period', async () => {
    const uuid = 'dddddddd-4444-4444-8444-444444444444';
    // .zst cannot be parsed without a zstd dep — 'unknown', not 'match'.
    write(
      join(home, '.codex', 'sessions', '2099', '01', '01', `${rollout(uuid)}.zst`),
      'binary'
    );
    const watch = watchForSessionId('codex', ctx(), { home, ...FAST });
    const started = Date.now();
    const got = await watch.promise;
    expect(got.sessionId).toBe(uuid);
    expect(got.viaGraceTimer).toBe(true); // "probably ours", and says so
    expect(Date.now() - started).toBeGreaterThanOrEqual(FAST.graceMs - 25);
  });

  /**
   * codex's store is GLOBAL and holds every session the user has ever run.
   * Without the freshness gate a restore would arm someone's months-old
   * conversation, so a record that predates the spawn is not a candidate at
   * all — by filename time AND by file time.
   */
  it('never returns a record that predates the spawn', async () => {
    write(
      join(home, '.codex', 'sessions', '2020', '01', '01',
        'rollout-2020-01-01T00-00-00-eeeeeeee-5555-4555-8555-555555555555.jsonl'),
      jsonl({ payload: { cwd } })
    );
    const watch = watchForSessionId(
      'codex',
      // Spawn is in the future relative to every timestamp the file carries.
      ctx({ sinceTs: Date.now() + 60_000 }),
      { home, ...FAST, timeoutMs: 400 }
    );
    await expect(watch.promise).rejects.toThrow(/could not record its resume id/);
  });
});

describe('qwen — the .runtime.json sidecar, keyed on the pane process tree', () => {
  const runtimeDir = (): string =>
    join(home, '.qwen', 'projects', sanitizeQwenCwd(cwd), 'chats');

  it('encodes the project dir by character substitution, not a hash', () => {
    expect(sanitizeQwenCwd('/Users/gdc/pi')).toBe('-Users-gdc-pi');
    expect(sanitizeQwenCwd('/tmp/a.b_c')).toBe('-tmp-a-b-c');
  });

  it('matches the sidecar whose pid belongs to the pane process tree', async () => {
    const mine = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const theirs = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    // A rival session in the same directory, run by an unrelated process.
    write(
      join(runtimeDir(), `${theirs}.runtime.json`),
      JSON.stringify({ pid: 999_999, session_id: theirs, work_dir: cwd })
    );
    // Ours records the GRANDCHILD pid, the way the real CLI does.
    write(
      join(runtimeDir(), `${mine}.runtime.json`),
      JSON.stringify({ pid: QWEN_PID, session_id: mine, work_dir: cwd })
    );

    const watch = watchForSessionId('qwen', ctx({ panePid: PANE_PID }), {
      home,
      ...FAST
    });
    await expect(watch.promise).resolves.toMatchObject({
      sessionId: mine,
      key: 'pid',
      viaGraceTimer: false
    });
  });

  it('never matches on a process table it could not read', async () => {
    // A `ps` that is missing or refuses: the reader rejects, the table is
    // empty, and the grandchild pid cannot be tied to the pane. The verdict
    // is unknown, so the watch keeps waiting and times out rather than
    // claiming a rival's session.
    setProcessTableReader(() => Promise.reject(new Error('spawn ps ENOENT')));
    const mine = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    write(
      join(runtimeDir(), `${mine}.runtime.json`),
      JSON.stringify({ pid: QWEN_PID, session_id: mine, work_dir: cwd })
    );
    const watch = watchForSessionId('qwen', ctx({ panePid: PANE_PID }), {
      home,
      ...FAST,
      timeoutMs: 400
    });
    await expect(watch.promise).rejects.toThrow(/could not record its resume id/);
    expect(await isDescendantOf(QWEN_PID, PANE_PID)).toBe(false);
  });

  it('rejects a sidecar recorded for a different working directory', async () => {
    const other = '33333333-cccc-4ccc-8ccc-cccccccccccc';
    write(
      join(runtimeDir(), `${other}.runtime.json`),
      JSON.stringify({ pid: process.pid, session_id: other, work_dir: '/elsewhere' })
    );
    const watch = watchForSessionId('qwen', ctx({ panePid: process.pid }), {
      home,
      ...FAST,
      timeoutMs: 400
    });
    await expect(watch.promise).rejects.toThrow(/could not record its resume id/);
  });

  /**
   * MEASURED on the real CLI: qwen's launcher forks twice, so the pid in
   * runtime.json is a GRANDCHILD of #{pane_pid} (1615 -> 1622 -> 1644, and
   * 1644 is what lands in the file). Matching pid EQUALITY finds nothing.
   */
  it('walks the ppid chain — an equality check would find nothing', async () => {
    expect(await isDescendantOf(PANE_PID, PANE_PID)).toBe(true);
    expect(await isDescendantOf(QWEN_LAUNCHER_PID, PANE_PID)).toBe(true);
    expect(await isDescendantOf(QWEN_PID, PANE_PID)).toBe(true);
    // The walk goes UP from the recorded pid, never down from the pane.
    expect(await isDescendantOf(PANE_PID, QWEN_PID)).toBe(false);
    expect(await isDescendantOf(STRANGER_PID, PANE_PID)).toBe(false);
    expect(await isDescendantOf(999_999, PANE_PID)).toBe(false);
  });

  it('parses a comm that holds spaces, and keeps the first two fields numeric', () => {
    const rows = parseProcessTable(SCRIPTED_PS);
    expect(rows.size).toBe(7);
    expect(rows.get(STRANGER_PID)).toEqual({
      pid: STRANGER_PID,
      ppid: 2000,
      comm: '/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Helper.app/Contents/MacOS/Google Chrome Helper'
    });
    expect(parseProcessTable('garbage\n  x y z\n').size).toBe(0);
  });

  it('bounds the walk, so a long chain or a cycle can never spin it', () => {
    // A straight chain of 40 processes under pid 3000.
    const chain = new Map<number, { pid: number; ppid: number; comm: string }>();
    chain.set(3000, { pid: 3000, ppid: 1, comm: 'root' });
    for (let pid = 3001; pid <= 3040; pid += 1) {
      chain.set(pid, { pid, ppid: pid - 1, comm: 'link' });
    }
    expect(isDescendantIn(chain, 3024, 3000)).toBe(true);
    expect(isDescendantIn(chain, 3025, 3000)).toBe(false);
    // A table with a cycle in it: the bound is what ends the walk.
    const cycle = new Map<number, { pid: number; ppid: number; comm: string }>([
      [5, { pid: 5, ppid: 6, comm: 'a' }],
      [6, { pid: 6, ppid: 5, comm: 'b' }]
    ]);
    expect(isDescendantIn(cycle, 5, 7)).toBe(false);
  });
});

describe('muse — the tmux pane it stamps into its own transcript', () => {
  const sessionFile = (id: string): string =>
    join(home, '.local', 'share', 'muse', 'sessions', '2099', '01', '01', id,
      'session.jsonl');

  const routeFacts = (pane: string): unknown => ({
    payload_type: 'runtime.session.route_facts',
    payload: {
      kind: 'route_facts',
      record: { cwd, pid: 1, tmux_pane: pane, tmux_socket_path: '/tmp/tmux-501/gmux' }
    }
  });

  it('separates two muse sessions sharing one directory', async () => {
    const mine = '44444444-dddd-4ddd-8ddd-dddddddddddd';
    const theirs = '55555555-eeee-4eee-8eee-eeeeeeeeeeee';
    // cwd-matching could never tell these apart; the pane can.
    write(
      sessionFile(theirs),
      jsonl(
        { payload_type: 'runtime.session.metadata' },
        routeFacts('$77:@77.%78')
      )
    );
    write(
      sessionFile(mine),
      jsonl(
        { payload_type: 'runtime.session.metadata' },
        routeFacts('$99:@99.%100')
      )
    );

    const watch = watchForSessionId('muse', ctx({ tmuxSessionId: '$99' }), {
      home,
      ...FAST
    });
    await expect(watch.promise).resolves.toMatchObject({
      sessionId: mine,
      key: 'tmux-pane',
      confidence: 'exact',
      viaGraceTimer: false
    });
  });

  it('honours XDG_DATA_HOME and ignores subagent task-streams', async () => {
    const xdg = join(home, 'xdg');
    const id = '66666666-ffff-4fff-8fff-ffffffffffff';
    const sub = '77777777-0000-4000-8000-000000000000';
    const root = join(xdg, 'muse', 'sessions', '2099', '01', '01');
    write(join(root, id, 'session.jsonl'),
      jsonl({}, routeFacts('$5:@5.%6')));
    write(join(root, 'subagent', sub, 'session.jsonl'),
      jsonl({}, routeFacts('$5:@5.%6')));

    const watch = watchForSessionId('muse', ctx({ tmuxSessionId: '$5' }), {
      home,
      env: { XDG_DATA_HOME: xdg },
      ...FAST
    });
    await expect(watch.promise).resolves.toMatchObject({ sessionId: id });
  });

  it('waits rather than guessing while route_facts is unwritten', async () => {
    const id = '88888888-1111-4111-8111-999999999999';
    write(sessionFile(id), jsonl({ payload_type: 'runtime.session.metadata' }));
    const watch = watchForSessionId('muse', ctx({ tmuxSessionId: '$1' }), {
      home,
      ...FAST,
      graceMs: 100
    });
    // Unconfirmable, so it rides the grace timer and is labelled as such.
    await expect(watch.promise).resolves.toMatchObject({ viaGraceTimer: true });
  });
});

/**
 * pi is the REPAIR case, not a capture case: it pre-assigns, so a healthy
 * session never comes near this code. It exists for the rows the user
 * reported — pi-1 and pi1, both created 2026-08-10 in /Users/gdc/pi with a
 * NULL agent_session_id, both skipped by a boot rescue that only looked at
 * harvesting agents, and both with their transcript sitting on disk.
 *
 * The filenames below are the real shape from that machine, because the whole
 * question is whether TWO sessions in ONE directory can be told apart. They
 * can: the filename carries the session's start time.
 */
describe('pi — rescue by cwd directory + filename start time', () => {
  const piDir = (): string =>
    join(home, '.pi', 'agent', 'sessions', sanitizePiCwd(cwd));
  const piFile = (iso: string, id: string): string =>
    join(piDir(), `${iso}_${id}.jsonl`);
  const header = (id: string, at: string, where = cwd): string =>
    jsonl({ type: 'session', version: 3, id, timestamp: at, cwd: where });

  const first = '019feca8-1218-74e5-9422-208fd4070739';
  const second = '019fed09-e44c-7f3f-9544-16d25cfbd5a4';

  it('picks the session that started with THIS pane, not the newest in the folder', async () => {
    write(
      piFile('2026-08-10T17-11-05-496Z', first),
      header(first, '2026-08-10T17:11:05.496Z')
    );
    write(
      piFile('2026-08-10T18-57-56-300Z', second),
      header(second, '2026-08-10T18:57:56.300Z')
    );

    // The earlier row: both files exist, and "newest wins" would be wrong.
    const early = watchForSessionId(
      'pi',
      { cwd, sinceTs: Date.parse('2026-08-10T17:11:05.000Z') },
      { home, ...FAST }
    );
    await expect(early.promise).resolves.toMatchObject({
      sessionId: first,
      confidence: 'exact',
      viaGraceTimer: false
    });

    // The later row: the earlier file is out of its window entirely.
    const late = watchForSessionId(
      'pi',
      { cwd, sinceTs: Date.parse('2026-08-10T18:57:55.000Z') },
      { home, ...FAST }
    );
    await expect(late.promise).resolves.toMatchObject({ sessionId: second });
  });

  it('refuses a file from another project sharing the store root', async () => {
    // Only reachable via an explicit (FLAT) session dir, where every
    // project's sessions live together — line 1 carries the cwd, so it is
    // still a proof and not a guess.
    const flat = join(home, 'flat-sessions');
    write(
      join(flat, `2026-08-10T17-11-05-496Z_${first}.jsonl`),
      header(first, '2026-08-10T17:11:05.496Z', '/somewhere/else')
    );
    const watch = watchForSessionId(
      'pi',
      { cwd, sinceTs: Date.parse('2026-08-10T17:11:00.000Z') },
      { home, env: { PI_CODING_AGENT_SESSION_DIR: flat }, ...FAST }
    );
    await expect(watch.promise).rejects.toThrow(/Timed out/);
  });

  it('is a rescue route, not a capture strategy — create time must not watch', () => {
    // agentHarvestsId gates the create path; a pi session is armed before the
    // process exists, and its store stays empty until the first turn.
    expect(agentHarvestsId('pi')).toBe(false);
    expect(agentRescuesId('pi')).toBe(true);
    // …and it is the one agent whose store still answers after the pane dies.
    expect(agentRescuesIdAfterExit('pi')).toBe(true);
    for (const other of ['codex', 'muse', 'qwen', 'deepseek', 'antigravity'] as const) {
      expect(agentHarvestsId(other), other).toBe(true);
      expect(agentRescuesIdAfterExit(other), other).toBe(false);
    }
  });

  it('encodes the cwd the way pi does', () => {
    expect(sanitizePiCwd('/Users/gdc/pi')).toBe('--Users-gdc-pi--');
  });
});

describe('omp — the pi store moved, re-keyed, and with a title line on top', () => {
  const ompDir = (): string =>
    join(home, '.omp', 'agent', 'sessions', sanitizeOmpCwd(cwd, home, tmpdir()));
  const ompFile = (iso: string, id: string): string =>
    join(ompDir(), `${iso}_${id}.jsonl`);
  // The real 18.0.11 file shape, read from a live store on 2026-08-30:
  // line 1 is {"type":"title",...} and the session record sits on LINE 2.
  // A confirm that trusts the first JSON line calls every real omp file
  // 'unknown', which is the defect this fixture pins.
  const body = (id: string, at: string, where = cwd): string =>
    jsonl(
      { type: 'title', v: 1, title: '', updatedAt: at, pad: ' ' },
      { type: 'session', version: 3, id, timestamp: at, cwd: where }
    );

  const id = '01a05476-a4cc-7031-850f-a81d717c01ed';

  it('confirms a real-shape file from its line-2 session record', async () => {
    write(
      ompFile('2026-08-30T20-57-36-716Z', id),
      body(id, '2026-08-30T20:57:36.716Z')
    );
    const watch = watchForSessionId(
      'omp',
      { cwd, sinceTs: Date.parse('2026-08-30T20:57:36.000Z') },
      { home, ...FAST }
    );
    await expect(watch.promise).resolves.toMatchObject({
      sessionId: id,
      viaGraceTimer: false
    });
  });

  it('refuses a file whose line-2 cwd is another project', async () => {
    write(
      ompFile('2026-08-30T20-57-36-716Z', id),
      body(id, '2026-08-30T20:57:36.716Z', '/somewhere/else')
    );
    const watch = watchForSessionId(
      'omp',
      { cwd, sinceTs: Date.parse('2026-08-30T20:57:36.000Z') },
      { home, ...FAST }
    );
    await expect(watch.promise).rejects.toThrow(/Timed out/);
  });

  it('encodes the cwd in all three of omp’s buckets', () => {
    // Pure arithmetic: the roots do not exist, so realpath falls back to
    // the spelling given, and the buckets are decided by prefix alone.
    const H = '/Users/nobody-p169';
    const T = '/p169-tmp-root';
    expect(sanitizeOmpCwd(join(H, 'proj', 'x'), H, T)).toBe('-proj-x');
    expect(sanitizeOmpCwd(H, H, T)).toBe('-');
    expect(sanitizeOmpCwd(join(T, 'a', 'b'), H, T)).toBe('-tmp-a-b');
    expect(sanitizeOmpCwd(T, H, T)).toBe('-tmp');
    // Outside both, pi's legacy wrap survives. The abs bucket was checked
    // byte for byte against the directory a real 18.0.11 run wrote for a
    // cwd under /private/tmp on 2026-08-30.
    expect(sanitizeOmpCwd('/Volumes/work/repo', H, T)).toBe(
      '--Volumes-work-repo--'
    );
  });

  it('harvests at create time, unlike pi, and never rescues after exit', () => {
    expect(agentHarvestsId('omp')).toBe(true);
    expect(agentRescuesId('omp')).toBe(true);
    expect(agentRescuesIdAfterExit('omp')).toBe(false);
  });
});

describe('the weak harvest, honestly labelled', () => {
  it('deepseek keys on metadata.workspace inside the file', async () => {
    const id = '99999999-2222-4222-8222-aaaaaaaaaaaa';
    write(
      join(home, '.deepseek', 'sessions', `${id}.json`),
      JSON.stringify({ metadata: { id, workspace: cwd } })
    );
    const watch = watchForSessionId('deepseek', ctx(), { home, ...FAST });
    await expect(watch.promise).resolves.toMatchObject({
      sessionId: id,
      confidence: 'weak'
    });
  });
});

describe('antigravity confirms by process ownership (Phase 32)', () => {
  const brain = (id: string): string =>
    join(home, '.gemini', 'antigravity-cli', 'brain', id);

  it('grace-accepts when the probe cannot answer, and provenance says so', async () => {
    const id = 'aaaaaaaa-3333-4333-8333-bbbbbbbbbbbb';
    mkdirSync(brain(id), { recursive: true });
    // ok: false — lsof or ps unavailable. The descriptor degrades to the
    // pre-Phase-32 behavior: the grace timer accepts, and nothing may call
    // the answer proven.
    const watch = watchForSessionId('antigravity', ctx({ panePid: 4242 }), {
      home,
      ...FAST
    });
    const got = await watch.promise;
    expect(got.sessionId).toBe(id);
    expect(got.key).toBe('fd-owner');
    expect(got.viaGraceTimer).toBe(true);
    expect(
      harvestProvenance(got, { cwd, agentVersion: null, atCreate: true })
        .confidence
    ).toBe('grace-accepted');
  });

  it('confirms exactly when the pane agy holds the directory open', async () => {
    const id = 'aaaaaaaa-4444-4444-8444-cccccccccccc';
    mkdirSync(brain(id), { recursive: true });
    agyProbe.ok = true;
    agyProbe.owned.set(4242, new Set([id]));
    const watch = watchForSessionId('antigravity', ctx({ panePid: 4242 }), {
      home,
      ...FAST
    });
    const got = await watch.promise;
    expect(got.sessionId).toBe(id);
    expect(got.key).toBe('fd-owner');
    expect(got.confidence).toBe('exact');
    expect(got.viaGraceTimer).toBe(false);
    expect(
      harvestProvenance(got, { cwd, agentVersion: null, atCreate: true })
        .confidence
    ).toBe('exact');
  });

  it('rules out a candidate when the pane agy owns a DIFFERENT conversation', async () => {
    const mine = 'aaaaaaaa-5555-4555-8555-dddddddddddd';
    const theirs = 'bbbbbbbb-6666-4666-8666-eeeeeeeeeeee';
    mkdirSync(brain(mine), { recursive: true });
    mkdirSync(brain(theirs), { recursive: true });
    agyProbe.ok = true;
    agyProbe.owned.set(4242, new Set([mine]));
    const watch = watchForSessionId('antigravity', ctx({ panePid: 4242 }), {
      home,
      ...FAST
    });
    const got = await watch.promise;
    // The other directory is a mismatch, not a rival that weakens the match.
    expect(got.sessionId).toBe(mine);
    expect(got.viaGraceTimer).toBe(false);
  });

  it('stays unknown with no panePid, so the grace timer is the only route', async () => {
    const id = 'aaaaaaaa-7777-4777-8777-ffffffffffff';
    mkdirSync(brain(id), { recursive: true });
    agyProbe.ok = true;
    agyProbe.owned.set(4242, new Set([id]));
    // No panePid in the context: the probe is never asked.
    const watch = watchForSessionId('antigravity', ctx(), { home, ...FAST });
    const got = await watch.promise;
    expect(got.sessionId).toBe(id);
    expect(got.viaGraceTimer).toBe(true);
  });
});

describe('watch lifecycle', () => {
  it('a timeout says the session is fine and the id is not — never resolves', async () => {
    const watch = watchForSessionId('codex', ctx(), {
      home,
      pollIntervalMs: 25,
      timeoutMs: 200
    });
    await expect(watch.promise).rejects.toThrow(
      /The session runs fine, but Tortie could not record its resume id/
    );
  });

  it('cancel() stops the watch', async () => {
    const watch = watchForSessionId('muse', ctx(), { home, ...FAST });
    watch.cancel();
    await expect(watch.promise).rejects.toThrow(/cancelled/);
  });

  it('refuses to watch for an agent with no store descriptor at all', async () => {
    for (const agent of ['claude', 'gemini', 'cursor', 'droid'] as const) {
      const watch = watchForSessionId(agent, ctx(), { home, ...FAST });
      await expect(watch.promise).rejects.toThrow(/does not harvest/);
    }
  });

  it('pi is watchable, but only as a rescue — never at create time', async () => {
    // Its store stays EMPTY until the first turn, so a codex-style watch at
    // create would return nothing for exactly the panes nobody has talked to
    // yet. agentHarvestsId is the create-path gate and stays false; the watch
    // itself works, for a row whose id the launch path never recorded.
    expect(agentHarvestsId('pi')).toBe(false);
    const watch = watchForSessionId('pi', ctx(), { home, ...FAST });
    await expect(watch.promise).rejects.toThrow(/Timed out/);
  });
});
