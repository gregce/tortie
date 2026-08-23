/**
 * Redaction happens INSIDE the store, on the write path, and nowhere else
 * (Phase 137, spec section 8).
 *
 * replaceTurnsFrom is handed raw reader output carrying real secret shapes
 * on both sides of the turn. The proof is at the byte level: after the WAL
 * is checkpointed into the main file, none of the raw secrets appears in
 * the database file's bytes, the [REDACTED:name] marks do, and an ordinary
 * project path survives untouched because the git mark needs it.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openOverviewStore } from '../store';
import type { ReadTurn } from '../reader';

let dir: string;
let dbPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-overview-redact-'));
  dbPath = join(dir, 'overview.db');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

// One value per secret shape the phase's exposure table names. The tokens
// are made up and shaped like the real thing, never real credentials.
const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const GITHUB_TOKEN = 'ghp_AAAAbbbbCCCCddddEEEEffffGGGGhhhh0011';
const ANTHROPIC_KEY =
  'sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
// Joined at runtime so the committed bytes hold no key shaped literal,
// which the push protection on the repository refuses.
const STRIPE_KEY = ['sk', 'live', 'AAAAbbbbCCCCddddEEEE0011'].join('_');
const EMAIL = 'person@example-company.com';
const PROJECT_PATH = 'src/main/overview/store/store.ts';

const SECRETS = [AWS_KEY, GITHUB_TOKEN, ANTHROPIC_KEY, STRIPE_KEY, EMAIL];

function secretTurn(): ReadTurn {
  return {
    index: 0,
    ask: {
      text:
        `Use the key ${AWS_KEY} and write to ${PROJECT_PATH}. ` +
        `Mail the result to ${EMAIL}.`,
      at: '2026-08-20T10:00:00Z',
      queued: 1
    },
    answer: {
      text:
        `Done. I set GITHUB_TOKEN=${GITHUB_TOKEN}, used ${ANTHROPIC_KEY} ` +
        `and billed through ${STRIPE_KEY}. The change is in ${PROJECT_PATH}.`,
      at: '2026-08-20T10:01:00Z'
    },
    closed: true,
    interrupted: false,
    notice: `the session stopped after mailing ${EMAIL}`,
    stopReason: 'end_turn',
    durationMs: 60_000,
    paths: [{ path: PROJECT_PATH, mentions: 2, source: 'tool', inside: true }],
    pathSource: 'tool-calls'
  };
}

describe('store redaction', () => {
  it('no raw secret reaches the database file, and the project path survives', () => {
    const store = openOverviewStore(dbPath);
    store.replaceTurnsFrom('s-1', 0, [secretTurn()], null, 1, 1_000);

    // The API view first: both sides come back masked.
    const turns = store.listTurns('s-1');
    const ask = turns[0]?.askText ?? '';
    const answer = turns[0]?.answerText ?? '';
    for (const secret of SECRETS) {
      expect(ask).not.toContain(secret);
      expect(answer).not.toContain(secret);
    }
    expect(ask).toContain('[REDACTED:');
    expect(answer).toContain('[REDACTED:');
    expect(ask).toContain(PROJECT_PATH);
    expect(answer).toContain(PROJECT_PATH);
    expect(turns[0]?.notice ?? '').not.toContain(EMAIL);
    store.close();

    // Then the bytes. Checkpoint the WAL into the main file so the whole
    // database is in one place, then scan it raw.
    const db = new Database(dbPath);
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    const walPath = `${dbPath}-wal`;
    let walBytes = '';
    try {
      if (statSync(walPath).size > 0) {
        walBytes = readFileSync(walPath, 'latin1');
      }
    } catch {
      // No WAL file left after the checkpoint. That is the expected case.
    }
    const bytes = readFileSync(dbPath, 'latin1') + walBytes;
    for (const secret of SECRETS) {
      expect(bytes).not.toContain(secret);
    }
    expect(bytes).toContain('[REDACTED:');
    expect(bytes).toContain(PROJECT_PATH);
  });

  it('a text with nothing secret in it is stored unchanged', () => {
    const store = openOverviewStore(dbPath);
    const plain: ReadTurn = {
      index: 0,
      ask: {
        text: 'Rename the store module and keep the tests green.',
        at: null,
        queued: 1
      },
      answer: { text: `The change is in ${PROJECT_PATH}.`, at: null },
      closed: true,
      interrupted: false,
      notice: null,
      stopReason: 'end_turn',
      durationMs: null,
      paths: [],
      pathSource: 'text-only'
    };
    store.replaceTurnsFrom('s-1', 0, [plain], null, 1, 1_000);
    const turns = store.listTurns('s-1');
    store.close();
    expect(turns[0]?.askText).toBe(
      'Rename the store module and keep the tests green.'
    );
    expect(turns[0]?.answerText).toBe(`The change is in ${PROJECT_PATH}.`);
  });
});
