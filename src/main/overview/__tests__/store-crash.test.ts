/**
 * A crash mid write leaves the previous state intact and readable
 * (Phase 137). This is a real interrupted run, not a claim.
 *
 * How the proof works. The product store is bundled once with esbuild, and
 * a plain node child process writes turns through it in a tight loop. Every
 * round rewrites three sessions from index 0, and every row of a round
 * carries the round number in its ask text. The parent kills the child with
 * SIGKILL at a random moment mid loop, reopens the file, and asserts:
 * - PRAGMA integrity_check answers ok.
 * - Every session's turn indexes are contiguous from 0.
 * - Every row of a session carries ONE round number, and the row count is
 *   exactly what that round wrote. A torn write would mix two rounds or
 *   leave a wrong count.
 * - turn and turn_fact hold the same index set, because the two are written
 *   in one transaction.
 * - The watermark's turnIndex equals the turn count it was stamped with.
 *
 * The child is spawned directly on the node binary, not through a runner,
 * so the SIGKILL lands on the process that holds the database open and
 * nothing is left running afterwards.
 */

import Database from 'better-sqlite3';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../..');

let dir: string;
let bundlePath: string;
let childPath: string;

const CHILD_SOURCE = `
'use strict';
const { openOverviewStore } = require(process.argv[2]);
const store = openOverviewStore(process.argv[3]);
const SESSIONS = ['s-a', 's-b', 's-c'];
function turnsFor(round, n) {
  const turns = [];
  for (let i = 0; i < n; i++) {
    turns.push({
      index: i,
      ask: { text: 'round ' + round + ' turn ' + i, at: null, queued: 1 },
      answer: { text: 'answer for round ' + round + ' turn ' + i, at: null },
      closed: true,
      interrupted: false,
      notice: null,
      stopReason: 'end_turn',
      durationMs: 5,
      paths: [{ path: 'src/a.ts', mentions: 1, source: 'tool', inside: true }],
      pathSource: 'tool-calls'
    });
  }
  return turns;
}
function watermarkFor(n) {
  return {
    kind: 'byte-offset',
    file: '/scratch/session.jsonl',
    size: String(n * 100),
    mtimeNs: '1',
    headHash: 'aaaa',
    tailHash: 'bbbb',
    offset: n * 100,
    open: false,
    turnIndex: n
  };
}
let round = 0;
for (;;) {
  round += 1;
  const n = 1 + (round % 30);
  for (const s of SESSIONS) {
    store.replaceTurnsFrom(s, 0, turnsFor(round, n), watermarkFor(n), 1, Date.now());
  }
  if (round === 1) process.stdout.write('WROTE_ONE\\n');
}
`;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-overview-crash-'));
  bundlePath = join(dir, 'store-bundle.cjs');
  childPath = join(dir, 'crash-child.cjs');

  const esbuild = join(ROOT, 'node_modules', '.bin', 'esbuild');
  const entry = join(ROOT, 'src', 'main', 'overview', 'store', 'index.ts');
  const result = spawnSync(
    esbuild,
    [
      entry,
      '--bundle',
      '--platform=node',
      '--format=cjs',
      `--outfile=${bundlePath}`,
      '--external:better-sqlite3',
      '--external:electron',
      '--external:electron-log',
      '--external:electron-log/main'
    ],
    { encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error(
      `esbuild could not bundle the store: ${result.stderr ?? result.error?.message ?? 'unknown'}`
    );
  }
  writeFileSync(childPath, CHILD_SOURCE);
}, 60_000);

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

interface KilledRun {
  /** How the child ended. Must be the SIGKILL, never its own exit. */
  signal: string | null;
  stderr: string;
}

/**
 * Start the writer, wait until it says one full round is committed, hold on
 * for a random slice of a write loop, then SIGKILL it mid write.
 */
function runAndKill(dbPath: string, extraMs: number): Promise<KilledRun> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [childPath, bundlePath, dbPath], {
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_PATH: join(ROOT, 'node_modules'),
        ELECTRON_OVERRIDE_DIST_PATH: join(ROOT, 'node_modules', 'electron', 'dist')
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stderr = '';
    let killTimer: ReturnType<typeof setTimeout> | null = null;
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.stdout?.on('data', (chunk: Buffer) => {
      if (chunk.toString().includes('WROTE_ONE') && killTimer === null) {
        killTimer = setTimeout(() => child.kill('SIGKILL'), extraMs);
      }
    });
    child.on('error', rejectPromise);
    child.on('exit', (code, signal) => {
      if (killTimer !== null) clearTimeout(killTimer);
      if (signal === null) {
        rejectPromise(
          new Error(
            `the writer exited on its own with code ${code} instead of ` +
              `being killed. stderr: ${stderr}`
          )
        );
        return;
      }
      resolvePromise({ signal, stderr });
    });
  });
}

interface SessionState {
  round: number;
  count: number;
}

/** Read one session's rows back and hold them to the atomicity invariants. */
function checkSession(db: Database.Database, sessionId: string): SessionState {
  const turnRows = db
    .prepare<[string], { turn_index: number; ask_text: string }>(
      'SELECT turn_index, ask_text FROM turn WHERE session_id = ? ORDER BY turn_index'
    )
    .all(sessionId);
  expect(turnRows.length).toBeGreaterThan(0);

  const rounds = new Set<number>();
  turnRows.forEach((row, i) => {
    expect(row.turn_index).toBe(i);
    const match = /^round (\d+) turn (\d+)$/.exec(row.ask_text);
    expect(match).not.toBeNull();
    rounds.add(Number(match?.[1]));
    expect(Number(match?.[2])).toBe(i);
  });
  expect(rounds.size).toBe(1);
  const round = [...rounds][0] ?? 0;
  expect(turnRows.length).toBe(1 + (round % 30));

  const factIndexes = db
    .prepare<[string], { turn_index: number }>(
      'SELECT turn_index FROM turn_fact WHERE session_id = ? ORDER BY turn_index'
    )
    .all(sessionId)
    .map((r) => r.turn_index);
  expect(factIndexes).toEqual(turnRows.map((r) => r.turn_index));

  const sessionRow = db
    .prepare<[string], { watermark: string | null }>(
      'SELECT watermark FROM session WHERE session_id = ?'
    )
    .get(sessionId);
  expect(sessionRow).toBeDefined();
  expect(sessionRow?.watermark).not.toBeNull();
  const watermark = JSON.parse(sessionRow?.watermark ?? 'null') as {
    turnIndex: number;
  };
  expect(watermark.turnIndex).toBe(turnRows.length);

  return { round, count: turnRows.length };
}

describe('a SIGKILL mid write', () => {
  it('leaves the previous state intact and readable, four times over', async () => {
    // Four interrupted runs with different hold times, so the kill lands in
    // different places inside the write loop.
    const holds = [5, 25, 60, 110];
    for (const [iteration, holdMs] of holds.entries()) {
      const dbPath = join(dir, `crash-${iteration}.db`);
      const run = await runAndKill(dbPath, holdMs);
      expect(run.signal).toBe('SIGKILL');

      const db = new Database(dbPath);
      try {
        const verdict = db.pragma('integrity_check', { simple: true });
        expect(verdict).toBe('ok');
        for (const sessionId of ['s-a', 's-b', 's-c']) {
          checkSession(db, sessionId);
        }
      } finally {
        db.close();
      }
    }
  }, 120_000);
});
