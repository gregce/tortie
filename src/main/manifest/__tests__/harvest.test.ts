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
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  isDescendantOf,
  resetProcessParentCache,
  sanitizeQwenCwd,
  watchForSessionId,
  type HarvestContext
} from '../harvest';

let home = '';
let cwd = '';

/** Fast polling so a test does not wait on a 1 Hz clock. */
const FAST = { pollIntervalMs: 25, timeoutMs: 4_000, graceMs: 150 } as const;

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
});

afterEach(() => {
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
    write(
      join(runtimeDir(), `${mine}.runtime.json`),
      JSON.stringify({ pid: process.pid, session_id: mine, work_dir: cwd })
    );

    const watch = watchForSessionId('qwen', ctx({ panePid: process.pid }), {
      home,
      ...FAST
    });
    await expect(watch.promise).resolves.toMatchObject({
      sessionId: mine,
      key: 'pid',
      viaGraceTimer: false
    });
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
    expect(await isDescendantOf(process.pid, process.pid)).toBe(true);
    const parent = process.ppid;
    expect(parent).toBeGreaterThan(1);
    expect(await isDescendantOf(process.pid, parent)).toBe(true);
    expect(await isDescendantOf(process.pid, 999_999)).toBe(false);
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

describe('the two weak harvests, honestly labelled', () => {
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

  it('antigravity can only correlate on time, and admits it', async () => {
    const id = 'aaaaaaaa-3333-4333-8333-bbbbbbbbbbbb';
    mkdirSync(join(home, '.gemini', 'antigravity-cli', 'brain', id), {
      recursive: true
    });
    const watch = watchForSessionId('antigravity', ctx(), { home, ...FAST });
    const got = await watch.promise;
    expect(got.sessionId).toBe(id);
    expect(got.key).toBe('time-only');
    expect(got.confidence).toBe('weak');
    // Nothing on disk links the id to a cwd, so it is NEVER a proven match.
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
      /The session runs fine, but gmux could not record its resume id/
    );
  });

  it('cancel() stops the watch', async () => {
    const watch = watchForSessionId('muse', ctx(), { home, ...FAST });
    watch.cancel();
    await expect(watch.promise).rejects.toThrow(/cancelled/);
  });

  it('refuses to watch for an agent that pre-assigns its id', async () => {
    // pi is the trap: its store stays EMPTY until the first turn, so a
    // codex-style watch would return nothing for exactly the panes nobody
    // has talked to yet — the ones that come back blank.
    for (const agent of ['claude', 'pi', 'gemini', 'cursor', 'droid'] as const) {
      const watch = watchForSessionId(agent, ctx(), { home, ...FAST });
      await expect(watch.promise).rejects.toThrow(/does not harvest/);
    }
  });
});
